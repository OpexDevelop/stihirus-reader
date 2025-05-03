import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://stihirus.ru';
const API_BASE_URL = `${BASE_URL}/-zbb/api`;
const POEMS_PER_PAGE = 20;
const DEFAULT_REQUEST_DELAY_MS = 500;

const ERROR_CODES = {
    NETWORK_ERROR: 503,
    HTTP_ERROR: 502,
    API_ERROR: 500,
    PARSING_ERROR: 500,
    NOT_FOUND: 404,
    INVALID_INPUT: 400,
    UNKNOWN_ERROR: 500,
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function extractStatusCode(message) {
    const match = message.match(/status:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

function createErrorObject(message, code, originalError = null) {
    const errorObj = { code, message };
    if (originalError && originalError.message && originalError.message !== message) {
        if (!message.includes(originalError.message)) {
             errorObj.originalMessage = originalError.message;
        }
    }
    if (errorObj.originalMessage === errorObj.message) {
        delete errorObj.originalMessage;
    }
    return errorObj;
}

async function fetchHtml(url) {
    let response;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Node.js) stihirus-reader/1.4.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
    };

    try {
        response = await fetch(url, {
            headers: headers,
            redirect: 'follow',
        });

        if (!response.ok) {
            let errorBody = '';
            try { errorBody = await response.text(); } catch (e) { /* ignore */ }
            const errorMessage = `HTTP error! status: ${response.status} for ${url}. Body: ${errorBody.substring(0, 200)}`;
            const error = new Error(errorMessage);
            error.statusCode = response.status;
            throw error;
        }
        return await response.text();
    } catch (error) {
        if (!error.statusCode && !(error instanceof TypeError && error.message.includes('Invalid URL'))) {
            error.statusCode = ERROR_CODES.NETWORK_ERROR;
        }
        throw error;
    }
}

async function fetchApi(endpoint, data, refererUrl = BASE_URL + '/') {
    const apiUrl = `${API_BASE_URL}/${endpoint}`;
    let response;
    let originUrl = BASE_URL;

    try {
        const parsedReferer = new URL(refererUrl);
        originUrl = parsedReferer.origin;
    } catch (e) {
        originUrl = BASE_URL;
    }

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Node.js) stihirus-reader/1.4.0',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': originUrl,
        'Referer': refererUrl,
    };

    try {
        response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: new URLSearchParams(data).toString(),
        });

        if (!response.ok) {
             let errorBody = '';
             try { errorBody = await response.text(); } catch (e) { /* ignore */ }
             const errorMessage = `API error! status: ${response.status} for ${apiUrl}. Body: ${errorBody.substring(0,200)}`;
             const error = new Error(errorMessage);
             error.statusCode = response.status;
             throw error;
        }

        const result = await response.json();

        const isPoemFetch = endpoint === 'pr_read_avtor';
        const isFilterFetch = endpoint === 'pr_read_avtor_prozv_filter';

        if (result.status !== 'success' && !(isPoemFetch && Array.isArray(result.data)) && !isFilterFetch) {
             const errorMessage = `API returned status: ${result.status}. Message: ${result.message || 'No message'}`;
             const error = new Error(errorMessage);
             error.statusCode = ERROR_CODES.API_ERROR;
             error.apiStatus = result.status;
             throw error;
        }
        if (isFilterFetch && result.status === 'success' && (!result.razd || !result.year_month)) {
             const errorMessage = `API for filters returned success but missing 'razd' or 'year_month' arrays.`;
             const error = new Error(errorMessage);
             error.statusCode = ERROR_CODES.PARSING_ERROR;
             throw error;
        }

        return result;
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = error.message.includes('API returned status') ? ERROR_CODES.API_ERROR : ERROR_CODES.NETWORK_ERROR;
        }
        throw error;
    }
}

async function fetchUsernameForId(authorId, authorPageUrl = BASE_URL + '/') {
    try {
        const apiResponse = await fetchApi('pr_read_avtor', { id: authorId, from: 0 }, authorPageUrl);
        if (apiResponse.data && apiResponse.data.length > 0 && apiResponse.data[0].useruri) {
            return apiResponse.data[0].useruri;
        }
        return null;
    } catch (error) {
        return null;
    }
}

function parseAuthorInfoFromHtml(html) {
    try {
        const $ = cheerio.load(html);
        const info = {
            authorId: null, usernameFromHtml: null, description: '', avatarUrl: null, headerUrl: null,
            stats: { poems: 0, reviewsSent: 0, reviewsReceived: 0 },
            collections: [], lastVisit: '', status: '', isPremium: false,
        };

        const authorIdStr = $('.avtorinfo.page_avatar').attr('data-userid');
        if (authorIdStr) info.authorId = parseInt(authorIdStr, 10);

        info.usernameFromHtml = $('.avtorinfo__avtor-username').first().contents().filter((_, el) => el.type === 'text').text().trim() || null;
        if (!info.usernameFromHtml) {
            const userLink = $('.avtorinfo__avtor-username a').first().attr('href');
            if (userLink) info.usernameFromHtml = userLink.match(/\/avtor\/([^\/?]+)/)?.[1] || null;
        }
        if (!info.usernameFromHtml) {
            const avatarLink = $('.userinfo__avtor-username a').first().attr('href');
             if (avatarLink) info.usernameFromHtml = avatarLink.match(/\/avtor\/([^\/?]+)/)?.[1] || null;
        }

        info.description = $('.avtorinfo__userinfo.nl2br').text().trim();
        if (!info.description) {
             info.description = $('.col.main.col-12.col-md-6 .avtorinfo__userinfo.nl2br').text().trim();
        }

        const avatarSelectors = ['.page_avatar_img', '.userinfo__avtor-avatar'];
        for (const selector of avatarSelectors) {
            const element = $(selector).first();
            if (element.length) {
                let rawUrl = element.is('img') ? element.attr('src') : null;
                if (!rawUrl) {
                    const style = element.attr('style');
                    if (style) rawUrl = style.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, '') || null;
                }
                if (rawUrl && rawUrl !== '/img/profile/none.jpg') {
                    info.avatarUrl = rawUrl.startsWith('//') ? `https:${rawUrl}` : (rawUrl.startsWith('/') ? `${BASE_URL}${rawUrl}` : rawUrl);
                    break;
                }
            }
        }

        const headerSrc = $('.page_header_img').attr('src');
        if (headerSrc && headerSrc !== '/img/profile/none_header.jpg') {
             info.headerUrl = headerSrc.startsWith('//') ? `https:${headerSrc}` : (headerSrc.startsWith('/') ? `${BASE_URL}${headerSrc}` : headerSrc);
        }

        const statsCard = $('#show_stat');
        if (statsCard.length) {
            const pBars = statsCard.find('.progress-bar');
            const txt = statsCard.find('.card-text').text();
            info.stats.poems = parseInt(txt.match(/Произведений\s*([\d]+)/)?.[1] ?? pBars[0]?.attr('aria-valuenow') ?? '0', 10);
            info.stats.reviewsSent = parseInt(txt.match(/Написано отзывов\s*([\d]+)/)?.[1] ?? pBars[1]?.attr('aria-valuenow') ?? '0', 10);
            info.stats.reviewsReceived = parseInt(txt.match(/Получено отзывов\s*([\d]+)/)?.[1] ?? pBars[2]?.attr('aria-valuenow') ?? '0', 10);
        }

        $('#show_sborniki a.list-group-item').each((_, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            if (name && href && href !== '#') {
                 let fullUrl;
                 if (href.startsWith('http')) {
                     fullUrl = href;
                 } else if (href.startsWith('/')) {
                     fullUrl = `${BASE_URL}${href}`;
                 } else {
                     fullUrl = `${BASE_URL}/${href}`;
                 }
                 info.collections.push({ name, url: fullUrl });
            }
        });

        $('.card-footer .small').each((_, el) => {
            const text = $(el).text().trim();
            if (text.startsWith('Последний визит:')) {
                 info.lastVisit = text.replace('Последний визит:', '').trim();
            } else if (text.startsWith('Статус:')) {
                 info.status = $(el).find('b').text().trim() || text.replace('Статус:', '').trim();
            } else if (text.includes('Премиум доступ')) {
                 info.isPremium = true;
            }
        });

        return info;
    } catch (error) {
        const parseError = new Error("Failed to parse author page HTML.");
        parseError.statusCode = ERROR_CODES.PARSING_ERROR;
        throw parseError;
    }
}

function mapApiPoem(poem) {
    const gifts = poem.podarki ? poem.podarki.split(',').map(g => g.trim()).filter(g => g) : [];
    const uniquenessStatus = parseInt(poem.text_unique ?? '-1', 10);

    let contest = null;
    if (poem.contest_id && poem.contest_name) {
        contest = { id: parseInt(poem.contest_id, 10), name: poem.contest_name };
    }

    let holidaySection = null;
    if (poem.prazdel_id && poem.prazd_title) {
        holidaySection = {
            id: parseInt(poem.prazdel_id, 10),
            url: poem.prazd_url ? `${BASE_URL}/prazdel/${poem.prazd_url}` : null,
            title: poem.prazd_title
        };
    }

    return {
        id: parseInt(poem.id, 10),
        title: poem.title || '***',
        text: poem.body,
        created: poem.created,
        rubric: {
            name: poem.razd_name,
            url: poem.razd_url && poem.razd_url !== 'none' ? `${BASE_URL}/razdel/${poem.razd_url}` : null,
        },
        collection: poem.urazd_name !== 'не в сборнике' ? poem.urazd_name : null,
        rating: parseInt(poem.rating || '0', 10),
        commentsCount: parseInt(poem.comments_count || '0', 10),
        imageUrl: poem.background ? (poem.background.startsWith('/') ? `${BASE_URL}${poem.background}` : poem.background) : null,
        hasCertificate: poem.have_certificate === '1',
        gifts: gifts,
        uniquenessStatus: uniquenessStatus,
        contest: contest,
        holidaySection: holidaySection,
    };
}

async function resolveIdentifier(identifier) {
    let authorId = null;
    let username = null;
    let authorPageUrl = null;

    if (typeof identifier === 'number') {
        authorId = identifier;
        username = await fetchUsernameForId(authorId, BASE_URL + '/');
        if (!username) throw createErrorObject(`Could not find username for author ID ${authorId}.`, ERROR_CODES.NOT_FOUND);
        authorPageUrl = `https://${username}.stihirus.ru/`;
    } else if (typeof identifier === 'string') {
        let urlObject = null;
        let isPotentiallyValidUrl = false;
        try {
            urlObject = new URL(identifier);
            isPotentiallyValidUrl = true;
        } catch (e) {
             if (identifier.includes('.') || identifier.includes('/')) {
                 try {
                     urlObject = new URL(`https://${identifier}`);
                     isPotentiallyValidUrl = true;
                 } catch (e2) {
                     isPotentiallyValidUrl = false;
                 }
             } else {
                 isPotentiallyValidUrl = false;
             }
        }

        if (isPotentiallyValidUrl && urlObject) {
             if (urlObject.hostname.endsWith('.stihirus.ru') && urlObject.hostname.split('.').length > 2) {
                username = urlObject.hostname.split('.')[0];
                authorPageUrl = urlObject.origin + '/';
            } else if (urlObject.hostname === 'stihirus.ru' && urlObject.pathname.startsWith('/avtor/')) {
                username = urlObject.pathname.split('/')[2];
                if (!username) throw createErrorObject(`Could not extract username from path URL: ${identifier}`, ERROR_CODES.INVALID_INPUT);
                authorPageUrl = `https://${username}.stihirus.ru/`;
            } else {
                throw createErrorObject(`Unrecognized URL format: ${identifier}`, ERROR_CODES.INVALID_INPUT);
            }
            try {
                 const html = await fetchHtml(authorPageUrl);
                 const info = parseAuthorInfoFromHtml(html);
                 if (!info.authorId) throw new Error('Could not parse authorId from page');
                 authorId = info.authorId;
            } catch(err) {
                 if (authorPageUrl.includes(`${username}.stihirus.ru`)) {
                     const fallbackUrl = `${BASE_URL}/avtor/${username}`;
                     try {
                         const fallbackHtml = await fetchHtml(fallbackUrl);
                         const fallbackInfo = parseAuthorInfoFromHtml(fallbackHtml);
                         if (!fallbackInfo.authorId) throw new Error('Could not parse authorId from fallback page');
                         authorId = fallbackInfo.authorId;
                         authorPageUrl = fallbackUrl;
                     } catch (fallbackErr) {
                          throw createErrorObject(`Could not determine author ID for URL ${identifier}. Fetch/parse failed.`, ERROR_CODES.NOT_FOUND, fallbackErr instanceof Error ? fallbackErr : null);
                     }
                 } else {
                     throw createErrorObject(`Could not determine author ID for URL ${identifier}. Fetch/parse failed.`, ERROR_CODES.NOT_FOUND, err instanceof Error ? err : null);
                 }
            }

        } else {
            const isValidUsernameFormat = /^[a-zA-Z0-9-]+$/.test(identifier);
            if (isValidUsernameFormat && identifier.length > 0) {
                username = identifier;
                authorPageUrl = `https://${username}.stihirus.ru/`;
                 try {
                     const html = await fetchHtml(authorPageUrl);
                     const info = parseAuthorInfoFromHtml(html);
                     if (!info.authorId) throw new Error('Could not parse authorId from page');
                     authorId = info.authorId;
                 } catch(err) {
                     const fallbackUrl = `${BASE_URL}/avtor/${username}`;
                     try {
                         const fallbackHtml = await fetchHtml(fallbackUrl);
                         const fallbackInfo = parseAuthorInfoFromHtml(fallbackHtml);
                         if (!fallbackInfo.authorId) throw new Error('Could not parse authorId from fallback page');
                         authorId = fallbackInfo.authorId;
                         authorPageUrl = fallbackUrl;
                     } catch (fallbackErr) {
                          throw createErrorObject(`Could not determine author ID for username ${identifier}. Fetch/parse failed.`, ERROR_CODES.NOT_FOUND, fallbackErr instanceof Error ? fallbackErr : null);
                     }
                 }
            } else {
                throw createErrorObject(`Invalid identifier format: ${identifier}. Expected ID, username (letters, numbers, hyphen), subdomain URL, or path URL.`, ERROR_CODES.INVALID_INPUT);
            }
        }

    } else {
        throw createErrorObject('Identifier must be a number (ID) or a string (username/URL)', ERROR_CODES.INVALID_INPUT);
    }

    if (!authorId || !username || !authorPageUrl) {
         throw createErrorObject(`Could not resolve identifier: ${identifier}`, ERROR_CODES.UNKNOWN_ERROR);
    }

    return { authorId, username, authorPageUrl };
}


export async function getAuthorData(identifier, page = null, requestDelayMs = DEFAULT_REQUEST_DELAY_MS, filterOptions = null) {
    let authorId = null;
    let username = null;
    let authorPageUrl = null;
    let parsedInfo = null;
    const fetchedPoems = [];

    try {
        if (page !== null && (typeof page !== 'number' || !Number.isInteger(page) || page < 0)) {
             throw createErrorObject(`Invalid page parameter: ${page}. Must be null, 0, or a positive integer.`, ERROR_CODES.INVALID_INPUT);
        }
        if (typeof requestDelayMs !== 'number' || requestDelayMs < 0) {
            requestDelayMs = DEFAULT_REQUEST_DELAY_MS;
        }

        const resolved = await resolveIdentifier(identifier);
        authorId = resolved.authorId;
        username = resolved.username;
        authorPageUrl = resolved.authorPageUrl;

        try {
            const authorHtml = await fetchHtml(authorPageUrl);
            parsedInfo = parseAuthorInfoFromHtml(authorHtml);
            if (parsedInfo.authorId && parsedInfo.authorId !== authorId) {
                 // console.warn(`Resolved ID (${authorId}) differs from final page ID (${parsedInfo.authorId}). Using resolved ID.`);
            }
        } catch (error) {
             const statusCode = error.statusCode || extractStatusCode(error.message) || ERROR_CODES.HTTP_ERROR;
             throw createErrorObject(`Failed to fetch or parse final author page ${authorPageUrl}: ${error.message}`, statusCode, error instanceof Error ? error : null);
        }

        const apiParamsBase = { id: authorId };
        if (filterOptions?.rubricId) apiParamsBase.razdel_id = filterOptions.rubricId;
        if (filterOptions?.year) apiParamsBase.year = filterOptions.year;
        if (filterOptions?.month) apiParamsBase.month = filterOptions.month;


        if (page === null) {
            let from = 0;
            let keepFetching = true;
            while (keepFetching) {
                try {
                    const apiParams = { ...apiParamsBase, from: from };
                    const apiResponse = await fetchApi('pr_read_avtor', apiParams, authorPageUrl);
                    if (apiResponse && Array.isArray(apiResponse.data)) {
                        const poems = apiResponse.data;
                        if (poems.length > 0) {
                            fetchedPoems.push(...poems);
                            from += poems.length;
                            if (poems.length < POEMS_PER_PAGE) keepFetching = false;
                            else await sleep(requestDelayMs);
                        } else {
                            keepFetching = false;
                        }
                    } else {
                        keepFetching = false;
                    }
                } catch (apiError) {
                     keepFetching = false;
                }
            }
        } else if (page > 0) {
            const from = (page - 1) * POEMS_PER_PAGE;
            try {
                const apiParams = { ...apiParamsBase, from: from };
                const apiResponse = await fetchApi('pr_read_avtor', apiParams, authorPageUrl);
                if (apiResponse && Array.isArray(apiResponse.data)) {
                    fetchedPoems.push(...apiResponse.data);
                }
            } catch (apiError) {
                 // Ignore API error for single page fetch
            }
        }

        const finalUsername = parsedInfo.usernameFromHtml || username;
        const finalPoemCount = parsedInfo.stats.poems;

        if (finalPoemCount === 0 && fetchedPoems.length > 0 && page === null && !filterOptions) {
             parsedInfo.stats.poems = fetchedPoems.length;
        }

        const successData = {
            authorId: authorId,
            username: finalUsername,
            profileUrl: authorPageUrl,
            canonicalUsername: username,
            description: parsedInfo.description,
            avatarUrl: parsedInfo.avatarUrl,
            headerUrl: parsedInfo.headerUrl,
            status: parsedInfo.status,
            lastVisit: parsedInfo.lastVisit,
            stats: parsedInfo.stats,
            collections: parsedInfo.collections,
            isPremium: parsedInfo.isPremium,
            poems: fetchedPoems.map(mapApiPoem),
        };

        return { status: 'success', data: successData };

    } catch (error) {
        let finalError;
        if (error && error.code && error.message && typeof error.code === 'number') {
            finalError = error;
        } else {
            const errorMessage = (error instanceof Error ? error.message : String(error)) || 'An unknown error occurred.';
            let errorCode = ERROR_CODES.UNKNOWN_ERROR;
            if (error && error.statusCode) errorCode = error.statusCode;
            if (error instanceof TypeError && error.message.includes('Invalid URL')) {
                errorCode = ERROR_CODES.INVALID_INPUT;
            }
            finalError = createErrorObject(errorMessage, errorCode, error instanceof Error ? error : null);
        }
        return { status: 'error', error: finalError };
    }
}

export async function getAuthorFilters(identifier) {
     try {
        const resolved = await resolveIdentifier(identifier);
        const authorId = resolved.authorId;
        const authorPageUrl = resolved.authorPageUrl;

        const apiResponse = await fetchApi('pr_read_avtor_prozv_filter', { for_user_id: authorId }, authorPageUrl);

        const filtersData = {
            rubrics: apiResponse.razd.map(r => ({
                id: parseInt(r.id, 10),
                name: r.razd_name,
                count: parseInt(r.cnt, 10)
            })),
            dates: apiResponse.year_month.map(d => ({
                year: parseInt(d.year, 10),
                month: parseInt(d.month, 10),
                count: parseInt(d.cnt, 10)
            }))
        };

        return { status: 'success', data: filtersData };

     } catch (error) {
        let finalError;
        if (error && error.code && error.message && typeof error.code === 'number') {
            finalError = error;
        } else {
            const errorMessage = (error instanceof Error ? error.message : String(error)) || 'An unknown error occurred.';
            let errorCode = ERROR_CODES.UNKNOWN_ERROR;
            if (error && error.statusCode) errorCode = error.statusCode;
             if (error instanceof TypeError && error.message.includes('Invalid URL')) {
                errorCode = ERROR_CODES.INVALID_INPUT;
            }
            finalError = createErrorObject(errorMessage, errorCode, error instanceof Error ? error : null);
        }
        return { status: 'error', error: finalError };
     }
}

function parseHomepageAuthors(html, selector) {
    const $ = cheerio.load(html);
    const authors = [];
    $(selector).find('.friends-window__friend-card').each((_, el) => {
        const link = $(el).find('a');
        const avatarDiv = $(el).find('.avatarimg');
        const nameDiv = $(el).find('.friends-window__fname');
        const badge = $(el).find('.u-badge');

        const profileUrl = link.attr('href');
        if (!profileUrl) return;

        const fullProfileUrl = profileUrl.startsWith('http') ? profileUrl : `${BASE_URL}${profileUrl}`;
        const usernameMatch = profileUrl.match(/\/avtor\/([^\/?]+)/);
        const canonicalUsername = usernameMatch ? usernameMatch[1] : '';
        const username = nameDiv.text().trim();

        let avatarUrl = null;
        const style = avatarDiv.attr('style');
        if (style) {
            const urlMatch = style.match(/url\(([^)]+)\)/);
            if (urlMatch && urlMatch[1] && urlMatch[1] !== '/img/profile/none.jpg') {
                 const rawUrl = urlMatch[1].replace(/['"]/g, '');
                 avatarUrl = rawUrl.startsWith('//') ? `https:${rawUrl}` : (rawUrl.startsWith('/') ? `${BASE_URL}${rawUrl}` : rawUrl);
            }
        }

        let poemsCount = null;
        let rating = null;
        const badgeTitle = badge.attr('title');
        if (badgeTitle) {
            const poemsMatch = badgeTitle.match(/произведений:\s*(\d+)/i);
            if (poemsMatch) poemsCount = parseInt(poemsMatch[1], 10);
            const ratingMatch = badgeTitle.match(/рейтинг произведений:\s*(\d+)/i);
             if (ratingMatch) rating = parseInt(ratingMatch[1], 10);
        } else {
             const badgeText = badge.text().trim();
             if (/^\d+$/.test(badgeText)) {
                 if (selector === '.card-week-rating') rating = parseInt(badgeText, 10);
                 else if (selector === '.card-recomended' || selector === '.card-active-avtors') poemsCount = parseInt(badgeText, 10);
             }
        }

        authors.push({
            username,
            canonicalUsername,
            profileUrl: fullProfileUrl,
            avatarUrl,
            poemsCount,
            rating
        });
    });
    return authors;
}

function parseHomepagePromoPoems(html) {
     const $ = cheerio.load(html);
     const poems = [];
     $('.card-recomended-proizv .card-body > div.border-bottom').each((_, el) => {
         const poemLink = $(el).find('span.link');
         const authorDiv = $(el).find('.small.text-right');
         const metaSpans = $(el).find('span.text-nowrap.small');

         const poemIdMatch = poemLink.attr('onclick')?.match(/pr_open_proizv\(this\).*data-proizvid="(\d+)"/);
         const poemId = poemIdMatch ? parseInt(poemIdMatch[1], 10) : null;
         const title = poemLink.text().trim();
         const authorUsername = authorDiv.text().trim();
         const authorLinkElement = authorDiv.find('a');
         let authorProfileUrl = `${BASE_URL}/avtor/${encodeURIComponent(authorUsername)}`;

         if (authorLinkElement.length > 0) {
             const href = authorLinkElement.attr('href');
             if (href) {
                 authorProfileUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
             }
         }

         if (!poemId || !title || !authorUsername) return;

         let rating = null;
         let commentsCount = null;

         metaSpans.each((_, span) => {
             const icon = $(span).find('i');
             const text = $(span).text().trim();
             if (icon.hasClass('fa-heart-o') || icon.hasClass('fa-heart')) {
                 rating = parseInt(text, 10);
             } else if (icon.hasClass('fa-comments-o')) {
                 commentsCount = parseInt(text, 10);
             }
         });

         poems.push({
             id: poemId,
             title: title,
             url: `${BASE_URL}/proizv/${poemId}`,
             authorUsername: authorUsername,
             authorProfileUrl: authorProfileUrl,
             rating: isNaN(rating) ? null : rating,
             commentsCount: isNaN(commentsCount) ? null : commentsCount,
         });
     });
     return poems;
}

export async function getRecommendedAuthors() {
    try {
        const html = await fetchHtml(BASE_URL);
        const authors = parseHomepageAuthors(html, '.card-recomended');
        return { status: 'success', data: authors };
    } catch (error) {
        const code = error.statusCode || ERROR_CODES.UNKNOWN_ERROR;
        return { status: 'error', error: createErrorObject(error.message, code, error) };
    }
}

export async function getPromoPoems() {
     try {
        const html = await fetchHtml(BASE_URL);
        const poems = parseHomepagePromoPoems(html);
        return { status: 'success', data: poems };
    } catch (error) {
        const code = error.statusCode || ERROR_CODES.UNKNOWN_ERROR;
        return { status: 'error', error: createErrorObject(error.message, code, error) };
    }
}

export async function getWeeklyRatedAuthors() {
     try {
        const html = await fetchHtml(BASE_URL);
        const authors = parseHomepageAuthors(html, '.card-week-rating');
        return { status: 'success', data: authors };
    } catch (error) {
        const code = error.statusCode || ERROR_CODES.UNKNOWN_ERROR;
        return { status: 'error', error: createErrorObject(error.message, code, error) };
    }
}

export async function getActiveAuthors() {
     try {
        const html = await fetchHtml(BASE_URL);
        const authors = parseHomepageAuthors(html, '.card-active-avtors');
        return { status: 'success', data: authors };
    } catch (error) {
        const code = error.statusCode || ERROR_CODES.UNKNOWN_ERROR;
        return { status: 'error', error: createErrorObject(error.message, code, error) };
    }
}

function parseSinglePoemPage(html, poemId) {
     try {
        const $ = cheerio.load(html);
        const poemCard = $('.card1');
        if (!poemCard.length) return null;

        const title = poemCard.find('.proizv-window__bodytitle').first().text().trim() || '***';
        const textContent = poemCard.find('.proizv-window__body').first();
        textContent.find('div.link').remove();
        const text = textContent.html()?.replace(/<br\s*\/?>/gi, '\n').trim() || '';

        const header = poemCard.find('.proizv-window__header').first();
        const authorLink = header.find('.proizv-window__title a').first();
        let authorUsername = header.find('.proizv-window__title').first().text().trim();
        let authorProfileUrl = null;
        let authorId = null;

        if (authorLink.length > 0) {
            authorUsername = authorLink.text().trim();
            const href = authorLink.attr('href');
            if (href) {
                authorProfileUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            }
        }

        const authorAvatarStyle = header.find('.avatarimg').attr('style');
        if (authorAvatarStyle) {
            const idMatch = authorAvatarStyle.match(/profile\/(\d+)\.jpg/);
            if (idMatch) authorId = parseInt(idMatch[1], 10);
        }

        const createdText = poemCard.find('.proizv-window__created').first().text().trim();

        const metaBottom = poemCard.find('.proizv-window__bottom').first();
        const rubricElement = metaBottom.find('.proizv-window__razdel').first();
        const rubricLink = rubricElement.find('a').first();
        let rubricName = '';
        let fullRubricUrl = null;

        if (rubricLink.length) {
            rubricName = rubricLink.text().trim();
            const rubricUrl = rubricLink.attr('href');
            fullRubricUrl = rubricUrl && rubricUrl !== '#' ? (rubricUrl.startsWith('http') ? rubricUrl : `${BASE_URL}${rubricUrl}`) : null;
        } else {
             rubricName = rubricElement.contents().filter(function() {
                return this.type === 'text';
             }).text().trim().split(/©|\n/)[0].trim();
             if (rubricName === 'Произведения без рубрики') fullRubricUrl = null;
        }
        if (!rubricName) rubricName = 'Без рубрики';

        const collectionName = null;

        const actions = poemCard.find('.proizv-window__actions').first();
        const ratingSpan = actions.find('.proizv-window__like .rating_count');
        const rating = ratingSpan.length ? parseInt(ratingSpan.text().trim(), 10) : 0;

        const commentsCount = 0;

        const imageUrl = poemCard.find('.proizv-window__body img').first().attr('src') || null;
        const fullImageUrl = imageUrl ? (imageUrl.startsWith('/') ? `${BASE_URL}${imageUrl}` : imageUrl) : null;

        const hasCertificate = actions.find('.proizv-window__certificate i').length > 0;

        const gifts = [];
        const uniquenessStatus = hasCertificate ? 1 : 0;

        const poemData = {
            id: poemId,
            title: title,
            text: text,
            created: createdText,
            rubric: { name: rubricName, url: fullRubricUrl },
            collection: collectionName,
            rating: isNaN(rating) ? 0 : rating,
            commentsCount: commentsCount,
            imageUrl: fullImageUrl,
            hasCertificate: hasCertificate,
            gifts: gifts,
            uniquenessStatus: uniquenessStatus,
            author: authorId && authorUsername && authorProfileUrl ? {
                id: authorId,
                username: authorUsername,
                profileUrl: authorProfileUrl
            } : null,
        };

        return poemData;

     } catch (error) {
        console.error(`Error parsing single poem page (ID: ${poemId}):`, error);
        throw createErrorObject(`Failed to parse poem page HTML for ID ${poemId}`, ERROR_CODES.PARSING_ERROR, error);
     }
}

export async function getPoemById(poemId) {
    if (typeof poemId !== 'number' || !Number.isInteger(poemId) || poemId <= 0) {
        return { status: 'error', error: createErrorObject('Invalid poem ID provided.', ERROR_CODES.INVALID_INPUT) };
    }
    const poemUrl = `${BASE_URL}/proizv/${poemId}`;
    try {
        const html = await fetchHtml(poemUrl);
        const poemData = parseSinglePoemPage(html, poemId);

        if (!poemData) {
             throw createErrorObject(`Poem content not found or could not be parsed on page ${poemUrl}`, ERROR_CODES.PARSING_ERROR);
        }

        return { status: 'success', data: poemData };
    } catch (error) {
        let code = error.code || error.statusCode || ERROR_CODES.UNKNOWN_ERROR;
        if (error.originalMessage?.includes('status: 404') || error.message?.includes('status: 404') || error.statusCode === 404) {
            code = ERROR_CODES.NOT_FOUND;
        }
        const message = error.code ? error.message : `Failed to fetch or parse poem ID ${poemId}: ${error.message}`;
        return { status: 'error', error: createErrorObject(message, code, error instanceof Error ? error : null) };
    }
}
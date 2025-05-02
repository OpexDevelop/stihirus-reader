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

/**
 * @param {string} message
 * @returns {number | null}
 */
function extractStatusCode(message) {
    const match = message.match(/status:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * @param {string} message
 * @param {number} code
 * @param {Error | null} [originalError=null]
 * @returns {import('./index.d.ts').StihirusError}
 */
function createErrorObject(message, code, originalError = null) {
    /** @type {import('./index.d.ts').StihirusError} */
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

/**
 * @param {string} url
 * @param {string | null} [proxyUrl=null]
 * @param {string | null} [proxyApiKey=null]
 * @returns {Promise<string>}
 * @throws {Error & {statusCode?: number}}
 */
async function fetchHtml(url, proxyUrl = null, proxyApiKey = null) {
    let response;
    const targetUrl = proxyUrl ? `${proxyUrl}/proxy/${url}` : url;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Sec-GPC': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': proxyUrl ? 'cross-site' : 'same-site',
        'Upgrade-Insecure-Requests': '1',
    };

    if (proxyUrl && proxyApiKey) {
        // @ts-ignore
        headers['X-Proxy-Api-Key'] = proxyApiKey;
    }

    try {
        response = await fetch(targetUrl, {
            // @ts-ignore
            headers: headers,
            redirect: 'follow',
        });

        if (!response.ok) {
            let errorBody = '';
            try { errorBody = await response.text(); } catch (e) { /* ignore */ }
            const errorMessage = `HTTP error! status: ${response.status} for ${targetUrl}. Body: ${errorBody.substring(0, 200)}`;
            const error = new Error(errorMessage);
            // @ts-ignore
            error.statusCode = response.status;
            throw error;
        }
        return await response.text();
    } catch (error) {
        // @ts-ignore
        if (!error.statusCode && !(error instanceof TypeError && error.message.includes('Invalid URL'))) {
            // @ts-ignore
            error.statusCode = ERROR_CODES.NETWORK_ERROR;
        }
        throw error;
    }
}

/**
 * @param {string} endpoint
 * @param {Record<string, any>} data
 * @param {string} [refererUrl=BASE_URL + '/']
 * @param {string | null} [proxyUrl=null]
 * @param {string | null} [proxyApiKey=null]
 * @returns {Promise<any>}
 * @throws {Error & {statusCode?: number, apiStatus?: string}}
 */
async function fetchApi(endpoint, data, refererUrl = BASE_URL + '/', proxyUrl = null, proxyApiKey = null) {
    const originalApiUrl = `${API_BASE_URL}/${endpoint}`;
    const targetUrl = proxyUrl ? `${proxyUrl}/proxy/${originalApiUrl}` : originalApiUrl;
    let response;
    let originUrl = BASE_URL;

    if (!proxyUrl) {
        try {
            const parsedReferer = new URL(refererUrl);
            originUrl = parsedReferer.origin;
        } catch (e) {
            originUrl = BASE_URL;
        }
    }

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'DNT': '1',
        'Sec-GPC': '1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': proxyUrl ? 'cross-site' : 'same-site',
    };

    if (proxyUrl && proxyApiKey) {
        // @ts-ignore
        headers['X-Proxy-Api-Key'] = proxyApiKey;
    } else {
        // @ts-ignore
        headers['Origin'] = originUrl;
        // @ts-ignore
        headers['Referer'] = refererUrl;
    }

    try {
        response = await fetch(targetUrl, {
            method: 'POST',
            // @ts-ignore
            headers: headers,
            body: new URLSearchParams(data).toString(),
        });

        if (!response.ok) {
             let errorBody = '';
             try { errorBody = await response.text(); } catch (e) { /* ignore */ }
             const errorMessage = `API error! status: ${response.status} for ${targetUrl}. Body: ${errorBody.substring(0,200)}`;
             const error = new Error(errorMessage);
             // @ts-ignore
             error.statusCode = response.status;
             throw error;
        }

        const result = await response.json();

        const isPoemFetch = endpoint === 'pr_read_avtor';
        const isFilterFetch = endpoint === 'pr_read_avtor_prozv_filter';

        if (result.status !== 'success' && !(isPoemFetch && Array.isArray(result.data)) && !isFilterFetch) {
             const errorMessage = `API returned status: ${result.status}. Message: ${result.message || 'No message'}`;
             const error = new Error(errorMessage);
             // @ts-ignore
             error.statusCode = ERROR_CODES.API_ERROR;
             // @ts-ignore
             error.apiStatus = result.status;
             throw error;
        }
        if (isFilterFetch && result.status === 'success' && (!result.razd || !result.year_month)) {
             const errorMessage = `API for filters returned success but missing 'razd' or 'year_month' arrays.`;
             const error = new Error(errorMessage);
             // @ts-ignore
             error.statusCode = ERROR_CODES.PARSING_ERROR;
             throw error;
        }

        return result;
    } catch (error) {
        // @ts-ignore
        if (!error.statusCode) {
            // @ts-ignore
            error.statusCode = error.message.includes('API returned status') ? ERROR_CODES.API_ERROR : ERROR_CODES.NETWORK_ERROR;
        }
        throw error;
    }
}

/**
 * @param {number} authorId
 * @param {string} [authorPageUrl=BASE_URL + '/']
 * @param {string | null} [proxyUrl=null]
 * @param {string | null} [proxyApiKey=null]
 * @returns {Promise<string | null>}
 */
async function fetchUsernameForId(authorId, authorPageUrl = BASE_URL + '/', proxyUrl = null, proxyApiKey = null) {
    try {
        const apiResponse = await fetchApi('pr_read_avtor', { id: authorId, from: 0 }, authorPageUrl, proxyUrl, proxyApiKey);
        if (apiResponse.data && apiResponse.data.length > 0 && apiResponse.data[0].useruri) {
            return apiResponse.data[0].useruri;
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * @param {string} html
 * @returns {{ authorId: number | null; usernameFromHtml: string | null; description: string; avatarUrl: string | null; headerUrl: string | null; stats: import('./index.d.ts').StihirusAuthorStats; collections: import('./index.d.ts').StihirusCollectionInfo[]; lastVisit: string; status: string; }}
 * @throws {Error & {statusCode?: number}}
 */
function parseAuthorInfoFromHtml(html) {
    try {
        const $ = cheerio.load(html);
        const info = {
            authorId: null, usernameFromHtml: null, description: '', avatarUrl: null, headerUrl: null,
            stats: { poems: 0, reviewsSent: 0, reviewsReceived: 0 },
            collections: [], lastVisit: '', status: '',
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
            info.stats.poems = parseInt(txt.match(/Произведений\s*([\d]+)/)?.[1] ?? $(pBars[0]).attr('aria-valuenow') ?? '0', 10);
            info.stats.reviewsSent = parseInt(txt.match(/Написано отзывов\s*([\d]+)/)?.[1] ?? $(pBars[1]).attr('aria-valuenow') ?? '0', 10);
            info.stats.reviewsReceived = parseInt(txt.match(/Получено отзывов\s*([\d]+)/)?.[1] ?? $(pBars[2]).attr('aria-valuenow') ?? '0', 10);
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

        $('.card-footer .small.text-muted').each((_, el) => {
            const text = $(el).text().trim();
            if (text.startsWith('Последний визит:')) info.lastVisit = text.replace('Последний визит:', '').trim();
            else if (text.startsWith('Статус:')) info.status = $(el).find('b').text().trim() || text.replace('Статус:', '').trim();
        });

        return info;
    } catch (error) {
        const parseError = new Error("Failed to parse author page HTML.");
        // @ts-ignore
        parseError.statusCode = ERROR_CODES.PARSING_ERROR;
        throw parseError;
    }
}

/**
 * @param {any} poem
 * @returns {import('./index.d.ts').StihirusPoem}
 */
function mapApiPoem(poem) {
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
    };
}

/**
 * @param {string | number} identifier
 * @param {string | null} [proxyUrl=null]
 * @param {string | null} [proxyApiKey=null]
 * @returns {Promise<{authorId: number; username: string; authorPageUrl: string}>}
 * @throws {import('./index.d.ts').StihirusError}
 */
async function resolveIdentifier(identifier, proxyUrl = null, proxyApiKey = null) {
    let authorId = null;
    let username = null;
    let authorPageUrl = null;

    if (typeof identifier === 'number') {
        authorId = identifier;
        username = await fetchUsernameForId(authorId, BASE_URL + '/', proxyUrl, proxyApiKey);
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
                 const html = await fetchHtml(authorPageUrl, proxyUrl, proxyApiKey);
                 const info = parseAuthorInfoFromHtml(html);
                 if (!info.authorId) throw new Error('Could not parse authorId from page');
                 authorId = info.authorId;
            } catch(err) {
                 if (authorPageUrl.includes(`${username}.stihirus.ru`)) {
                     const fallbackUrl = `${BASE_URL}/avtor/${username}`;
                     try {
                         const fallbackHtml = await fetchHtml(fallbackUrl, proxyUrl, proxyApiKey);
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
                     const html = await fetchHtml(authorPageUrl, proxyUrl, proxyApiKey);
                     const info = parseAuthorInfoFromHtml(html);
                     if (!info.authorId) throw new Error('Could not parse authorId from page');
                     authorId = info.authorId;
                 } catch(err) {
                     const fallbackUrl = `${BASE_URL}/avtor/${username}`;
                     try {
                         const fallbackHtml = await fetchHtml(fallbackUrl, proxyUrl, proxyApiKey);
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


/**
 * Asynchronously fetches author data from stihirus.ru.
 * Can be used in Node.js or browser environments (requires CORS proxy for browser).
 *
 * @param {string | number} identifier - Author identifier (ID, username, subdomain URL, or path URL).
 * @param {number | null} [page=null] - Optional. Controls poem fetching: `null` (default) = all poems, `0` = profile only, `N > 0` = specific page N.
 * @param {number} [requestDelayMs=DEFAULT_REQUEST_DELAY_MS] - Optional. Delay between API calls when fetching all pages (`page = null`). Defaults to 500ms.
 * @param {string | null} [proxyUrl=null] - Optional. URL of the CORS proxy (e.g., 'https://your-proxy.com'). Required for browser usage.
 * @param {string | null} [proxyApiKey=null] - Optional. API key for the CORS proxy, if required. Sent as 'X-Proxy-Api-Key' header.
 * @returns {Promise<import('./index.d.ts').StihirusResponse>} A promise resolving to `StihirusResponse`. Check `status` field.
 */
export async function getAuthorData(identifier, page = null, requestDelayMs = DEFAULT_REQUEST_DELAY_MS, proxyUrl = null, proxyApiKey = null) {
    let authorId = null;
    let username = null;
    let authorPageUrl = null;
    let parsedInfo = null;
    /** @type {any[]} */
    const fetchedPoems = [];

    try {
        if (page !== null && (typeof page !== 'number' || !Number.isInteger(page) || page < 0)) {
             throw createErrorObject(`Invalid page parameter: ${page}. Must be null, 0, or a positive integer.`, ERROR_CODES.INVALID_INPUT);
        }
        if (typeof requestDelayMs !== 'number' || requestDelayMs < 0) {
            requestDelayMs = DEFAULT_REQUEST_DELAY_MS;
        }

        const resolved = await resolveIdentifier(identifier, proxyUrl, proxyApiKey);
        authorId = resolved.authorId;
        username = resolved.username;
        authorPageUrl = resolved.authorPageUrl;

        try {
            const authorHtml = await fetchHtml(authorPageUrl, proxyUrl, proxyApiKey);
            parsedInfo = parseAuthorInfoFromHtml(authorHtml);
            if (parsedInfo.authorId && parsedInfo.authorId !== authorId) {
                 // console.warn(`Resolved ID (${authorId}) differs from final page ID (${parsedInfo.authorId}). Using resolved ID.`);
            }
        } catch (error) {
             // @ts-ignore
             const statusCode = error.statusCode || extractStatusCode(error.message) || ERROR_CODES.HTTP_ERROR;
             throw createErrorObject(`Failed to fetch or parse final author page ${authorPageUrl}: ${error.message}`, statusCode, error instanceof Error ? error : null);
        }

        if (page === null) {
            let from = 0;
            let keepFetching = true;
            while (keepFetching) {
                try {
                    const apiResponse = await fetchApi('pr_read_avtor', { id: authorId, from: from }, authorPageUrl, proxyUrl, proxyApiKey);
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
                const apiResponse = await fetchApi('pr_read_avtor', { id: authorId, from: from }, authorPageUrl, proxyUrl, proxyApiKey);
                if (apiResponse && Array.isArray(apiResponse.data)) {
                    fetchedPoems.push(...apiResponse.data);
                }
            } catch (apiError) {
                 // Ignore API error for single page fetch
            }
        }

        const finalUsername = parsedInfo.usernameFromHtml || username;
        const finalPoemCount = parsedInfo.stats.poems;

        if (finalPoemCount === 0 && fetchedPoems.length > 0 && page === null) {
             parsedInfo.stats.poems = fetchedPoems.length;
        }

        /** @type {import('./index.d.ts').StihirusAuthorData} */
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
            poems: fetchedPoems.map(mapApiPoem),
        };

        return { status: 'success', data: successData };

    } catch (error) {
        /** @type {import('./index.d.ts').StihirusError} */
        let finalError;
        // @ts-ignore
        if (error && error.code && error.message && typeof error.code === 'number') {
            // @ts-ignore
            finalError = error;
        } else {
            const errorMessage = (error instanceof Error ? error.message : String(error)) || 'An unknown error occurred.';
            let errorCode = ERROR_CODES.UNKNOWN_ERROR;
            // @ts-ignore
            if (error && error.statusCode) errorCode = error.statusCode;
            if (error instanceof TypeError && error.message.includes('Invalid URL')) {
                errorCode = ERROR_CODES.INVALID_INPUT;
            }
            finalError = createErrorObject(errorMessage, errorCode, error instanceof Error ? error : null);
        }
        return { status: 'error', error: finalError };
    }
}


/**
 * Asynchronously fetches available filter options (rubrics, dates) for an author's poems.
 * Can be used in Node.js or browser environments (requires CORS proxy for browser).
 *
 * @param {string | number} identifier - Author identifier (ID, username, subdomain URL, or path URL).
 * @param {string | null} [proxyUrl=null] - Optional. URL of the CORS proxy (e.g., 'https://your-proxy.com'). Required for browser usage.
 * @param {string | null} [proxyApiKey=null] - Optional. API key for the CORS proxy, if required. Sent as 'X-Proxy-Api-Key' header.
 * @returns {Promise<import('./index.d.ts').StihirusFiltersResponse>} A promise resolving to `StihirusFiltersResponse`. Check `status` field.
 */
export async function getAuthorFilters(identifier, proxyUrl = null, proxyApiKey = null) {
     try {
        const resolved = await resolveIdentifier(identifier, proxyUrl, proxyApiKey);
        const authorId = resolved.authorId;
        const authorPageUrl = resolved.authorPageUrl;

        const apiResponse = await fetchApi('pr_read_avtor_prozv_filter', { for_user_id: authorId }, authorPageUrl, proxyUrl, proxyApiKey);

        /** @type {import('./index.d.ts').StihirusAuthorFiltersData} */
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
        /** @type {import('./index.d.ts').StihirusError} */
        let finalError;
        // @ts-ignore
        if (error && error.code && error.message && typeof error.code === 'number') {
            // @ts-ignore
            finalError = error;
        } else {
            const errorMessage = (error instanceof Error ? error.message : String(error)) || 'An unknown error occurred.';
            let errorCode = ERROR_CODES.UNKNOWN_ERROR;
            // @ts-ignore
            if (error && error.statusCode) errorCode = error.statusCode;
             if (error instanceof TypeError && error.message.includes('Invalid URL')) {
                errorCode = ERROR_CODES.INVALID_INPUT;
            }
            finalError = createErrorObject(errorMessage, errorCode, error instanceof Error ? error : null);
        }
        return { status: 'error', error: finalError };
     }
}
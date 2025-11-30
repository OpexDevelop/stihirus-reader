import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://stihirus.ru';
const API_BASE_URL = `${BASE_URL}/-zbb/api`;
const POEMS_PER_PAGE = 20;
const DEFAULT_REQUEST_DELAY_MS = 200;

const ERROR_CODES = {
    NETWORK_ERROR: 503,
    API_ERROR: 500,
    PARSING_ERROR: 500,
    NOT_FOUND: 404,
    INVALID_INPUT: 400,
    UNKNOWN_ERROR: 500,
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function createErrorObject(message, code, originalError = null) {
    const errorObj = { code, message };
    if (originalError) errorObj.originalError = originalError.message;
    return errorObj;
}

async function fetchApi(endpoint, data, refererUrl = BASE_URL) {
    const apiUrl = `${API_BASE_URL}/${endpoint}`;
    const params = new URLSearchParams();
    for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
            params.append(key, data[key]);
        }
    }

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Node.js) stihirus-reader/1.5.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': refererUrl,
        'Origin': BASE_URL
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: params,
        });

        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.statusCode = response.status;
            throw error;
        }

        const result = await response.json();

        if (result.status === 'error') {
            const msg = result.message || 'Unknown API Error';
            if (msg.includes('denied') || msg.includes('доступ запрещен')) {
                const err = new Error('Access denied or Content not found');
                err.statusCode = ERROR_CODES.NOT_FOUND;
                throw err;
            }
            throw new Error(`API Error: ${msg}`);
        }

        return result;
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = ERROR_CODES.API_ERROR;
        }
        throw error;
    }
}

async function fetchHtml(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Node.js) stihirus-reader/1.5.0' }
        });
        if (response.status === 404) {
            const err = new Error('Page not found');
            err.statusCode = 404;
            throw err;
        }
        return await response.text();
    } catch (error) {
        if (!error.statusCode) error.statusCode = ERROR_CODES.NETWORK_ERROR;
        throw error;
    }
}

function mapApiPoem(poemApiData) {
    if (!poemApiData) return null;

    let text = poemApiData.body || '';
    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/\r\n/g, '\n').trim();

    const gifts = poemApiData.podarki && poemApiData.podarki !== 'proizv_like' 
        ? poemApiData.podarki.split(',').map(g => g.trim()).filter(g => g) 
        : [];

    return {
        id: parseInt(poemApiData.id, 10),
        title: poemApiData.title || '***',
        text: text,
        created: poemApiData.created,
        rating: parseInt(poemApiData.rating || '0', 10),
        commentsCount: parseInt(poemApiData.comments_count || '0', 10),
        rubric: {
            name: poemApiData.razd_name,
            url: poemApiData.razd_url ? `${BASE_URL}/razdel/${poemApiData.razd_url}` : null
        },
        collection: poemApiData.urazd_name !== 'не в сборнике' ? poemApiData.urazd_name : null,
        imageUrl: poemApiData.background ? 
            (poemApiData.background.startsWith('http') ? poemApiData.background : `${BASE_URL}${poemApiData.background}`) 
            : null,
        uniquenessStatus: parseInt(poemApiData.text_unique, 10),
        hasCertificate: poemApiData.have_certificate === '1',
        gifts: gifts,
        contest: poemApiData.contest_id ? { id: parseInt(poemApiData.contest_id), name: poemApiData.contest_name } : null,
        holidaySection: null,
        author: {
            id: parseInt(poemApiData.avtor_id || poemApiData.user_id, 10),
            username: poemApiData.username,
            profileUrl: poemApiData.useruri ? `${BASE_URL}/avtor/${poemApiData.useruri}` : null
        }
    };
}

async function resolveIdentifier(identifier) {
    let authorId = null;
    let url = null;
    let username = null;

    if (typeof identifier === 'number') {
        try {
            const apiRes = await fetchApi('pr_read_avtor', { id: identifier, from: 0 });
            if (apiRes.data && apiRes.data.length > 0) {
                const item = apiRes.data[0];
                return {
                    authorId: identifier,
                    username: item.useruri,
                    profileUrl: `${BASE_URL}/avtor/${item.useruri}`,
                    html: null
                };
            }
        } catch (e) { }
        
        const err = new Error(`Author ID ${identifier} not found`);
        err.statusCode = 404;
        throw err;
    } 
    
    if (identifier.includes('stihirus.ru') || identifier.includes('/')) {
        url = identifier.startsWith('http') ? identifier : `https://${identifier}`;
        if (!url.includes('stihirus.ru')) {
             const err = new Error('Invalid URL format');
             err.statusCode = 400;
             throw err;
        }
    } else {
        if (!/^[a-zA-Z0-9-_]+$/.test(identifier)) {
             const err = new Error('Invalid identifier format');
             err.statusCode = 400;
             throw err;
        }
        url = `${BASE_URL}/avtor/${identifier}`;
    }

    try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        const idStr = $('.avtorinfo').attr('data-userid');
        if (idStr) {
            authorId = parseInt(idStr, 10);
        } else {
            const err = new Error('Author not found');
            err.statusCode = 404;
            throw err;
        }

        return {
            authorId,
            html,
            username: url.split('/avtor/')[1]?.split('/')[0] || identifier,
            profileUrl: url
        };
    } catch (e) {
        throw e;
    }
}

function parseProfileExtras(html) {
    const $ = cheerio.load(html);
    const info = {
        description: $('.avtorinfo__userinfo').text().trim(),
        headerUrl: null,
        stats: { poems: 0, reviewsSent: 0, reviewsReceived: 0 },
        collections: [],
        lastVisit: '',
        status: '',
        isPremium: false
    };

    const headerImg = $('.page_header_img').attr('src');
    if (headerImg && !headerImg.includes('none_header')) {
        info.headerUrl = headerImg.startsWith('/') ? `${BASE_URL}${headerImg}` : headerImg;
    }

    const avatarElement = $('.page_avatar_img');
    let avatarUrl = avatarElement.attr('src');
    if (!avatarUrl || avatarUrl === '/img/profile/none.jpg') {
        info.avatarUrl = null;
    } else {
        info.avatarUrl = avatarUrl.startsWith('/') ? `${BASE_URL}${avatarUrl}` : avatarUrl;
    }

    const statsCard = $('#show_stat');
    if (statsCard.length) {
       const bars = statsCard.find('.progress-bar');
       if (bars.length >= 3) {
           info.stats.poems = parseInt($(bars[0]).attr('aria-valuenow') || 0, 10);
           info.stats.reviewsSent = parseInt($(bars[1]).attr('aria-valuenow') || 0, 10);
           info.stats.reviewsReceived = parseInt($(bars[2]).attr('aria-valuenow') || 0, 10);
       }
    }
    
    $('#show_sborniki a').each((_, el) => {
        const href = $(el).attr('href');
        info.collections.push({
            name: $(el).text().trim(),
            url: href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : null
        });
    });

    $('.card-footer .small').each((_, el) => {
        const txt = $(el).text().trim();
        if (txt.includes('Последний визит:')) info.lastVisit = txt.replace('Последний визит:', '').trim();
        if (txt.includes('Статус:')) info.status = $(el).find('b').text().trim();
        if (txt.includes('Премиум доступ')) info.isPremium = true;
    });

    return info;
}

export async function getAuthorData(identifier, page = null, requestDelayMs = DEFAULT_REQUEST_DELAY_MS, filterOptions = null) {
    if (typeof requestDelayMs === 'object' && requestDelayMs !== null) {
        filterOptions = requestDelayMs;
        requestDelayMs = DEFAULT_REQUEST_DELAY_MS;
    }

    try {
        const authorMeta = await resolveIdentifier(identifier);
        
        let profileExtras = { stats: {}, collections: [] };
        if (authorMeta.html) {
            profileExtras = parseProfileExtras(authorMeta.html);
        } else {
            const html = await fetchHtml(authorMeta.profileUrl);
            profileExtras = parseProfileExtras(html);
        }

        const authorData = {
            authorId: authorMeta.authorId,
            username: authorMeta.username,
            profileUrl: authorMeta.profileUrl,
            canonicalUsername: authorMeta.username,
            ...profileExtras,
            avatarUrl: profileExtras.avatarUrl,
            poems: []
        };

        const apiParams = { id: authorMeta.authorId };
        
        let isFiltered = false;
        if (filterOptions) {
            if (filterOptions.rubricId) { apiParams.razdel_id = filterOptions.rubricId; isFiltered = true; }
            if (filterOptions.year) { apiParams.year = filterOptions.year; isFiltered = true; }
            if (filterOptions.month) { apiParams.month = filterOptions.month; isFiltered = true; }
        }

        if (page === 0) {
            return { status: 'success', data: authorData };
        }
        else if (page !== null && page > 0) {
            apiParams.from = (page - 1) * POEMS_PER_PAGE;
            const res = await fetchApi('pr_read_avtor', apiParams, authorMeta.profileUrl);
            if (res.data && Array.isArray(res.data)) {
                authorData.poems = res.data.map(mapApiPoem);
            }
        } 
        else {
            if (isFiltered) {
                let from = 0;
                let keepFetching = true;
                while(keepFetching) {
                    const currentParams = { ...apiParams, from: from };
                    const res = await fetchApi('pr_read_avtor', currentParams, authorMeta.profileUrl);
                    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                        authorData.poems.push(...res.data.map(mapApiPoem));
                        from += res.data.length;
                        if (res.data.length < POEMS_PER_PAGE) keepFetching = false;
                        else await sleep(requestDelayMs);
                    } else {
                        keepFetching = false;
                    }
                }
            } else {
                const totalPoems = authorData.stats.poems || 50; 
                const totalPages = Math.ceil(totalPoems / POEMS_PER_PAGE);
                
                if (totalPoems > 0) {
                    const promises = [];
                    const limitPages = Math.max(1, Math.min(totalPages, 100)); 

                    for (let i = 0; i < limitPages; i++) {
                        const currentParams = { ...apiParams, from: i * POEMS_PER_PAGE };
                        promises.push(
                            fetchApi('pr_read_avtor', currentParams, authorMeta.profileUrl)
                                .then(res => res.data || [])
                                .catch(() => [])
                        );
                        if (i % 5 === 0) await sleep(50);
                    }

                    const results = await Promise.all(promises);
                    const allRawPoems = results.flat();
                    const uniqueMap = new Map();
                    allRawPoems.forEach(p => {
                        if (p && p.id) uniqueMap.set(p.id, p);
                    });
                    authorData.poems = Array.from(uniqueMap.values()).map(mapApiPoem);
                }
            }
        }

        return { status: 'success', data: authorData };

    } catch (error) {
        return { 
            status: 'error', 
            error: createErrorObject(error.message, error.statusCode || ERROR_CODES.UNKNOWN_ERROR, error) 
        };
    }
}

export async function getPoemById(poemId) {
    if (typeof poemId !== 'number' || poemId <= 0) {
        return { status: 'error', error: createErrorObject('Invalid ID', ERROR_CODES.INVALID_INPUT) };
    }

    try {
        const result = await fetchApi('pr_read_avtor', { proizv_id: poemId });

        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
            const err = new Error(`Poem ${poemId} not found`);
            err.statusCode = 404;
            throw err;
        }

        const poemData = mapApiPoem(result.data[0]);
        return { status: 'success', data: poemData };

    } catch (error) {
        return { 
            status: 'error', 
            error: createErrorObject(error.message, error.statusCode || ERROR_CODES.UNKNOWN_ERROR, error) 
        };
    }
}

export async function getAuthorFilters(identifier) {
    try {
        const resolved = await resolveIdentifier(identifier);
        const apiResponse = await fetchApi('pr_read_avtor_prozv_filter', { for_user_id: resolved.authorId });
        
        const filtersData = {
            rubrics: (apiResponse.razd || []).map(r => ({
                id: parseInt(r.id, 10),
                name: r.razd_name,
                count: parseInt(r.cnt, 10)
            })),
            dates: (apiResponse.year_month || []).map(d => ({
                year: parseInt(d.year, 10),
                month: parseInt(d.month, 10),
                count: parseInt(d.cnt, 10)
            }))
        };
        return { status: 'success', data: filtersData };
    } catch (error) {
        const code = error.statusCode || 500;
        return { status: 'error', error: createErrorObject(error.message, code) };
    }
}

function parseHomepageAuthors(html, selector) {
    const $ = cheerio.load(html);
    const authors = [];
    $(selector).find('.friends-window__friend-card').each((_, el) => {
        const link = $(el).find('a');
        const href = link.attr('href');
        if (!href) return;

        const badge = $(el).find('.u-badge');
        
        let avatarUrl = null;
        const style = $(el).find('.avatarimg').attr('style');
        if (style) {
            const match = style.match(/url\(([^)]+)\)/);
            if (match && match[1]) {
                let raw = match[1].replace(/['"]/g, '');
                avatarUrl = raw.startsWith('/') ? `${BASE_URL}${raw}` : raw;
            }
        }

        authors.push({
            username: $(el).find('.friends-window__fname').text().trim(),
            profileUrl: `${BASE_URL}${href}`,
            avatarUrl: avatarUrl,
            poemsCount: parseInt(badge.text().trim(), 10) || 0, 
            rating: parseInt(badge.text().trim(), 10) || 0,
        });
    });
    return authors;
}

export async function getRecommendedAuthors() {
    try {
        const html = await fetchHtml(BASE_URL);
        return { status: 'success', data: parseHomepageAuthors(html, '.card-recomended') };
    } catch (e) { return { status: 'error', error: createErrorObject(e.message, 500) }; }
}

export async function getWeeklyRatedAuthors() {
    try {
        const html = await fetchHtml(BASE_URL);
        return { status: 'success', data: parseHomepageAuthors(html, '.card-week-rating') };
    } catch (e) { return { status: 'error', error: createErrorObject(e.message, 500) }; }
}

export async function getActiveAuthors() {
    try {
        const html = await fetchHtml(BASE_URL);
        return { status: 'success', data: parseHomepageAuthors(html, '.card-active-avtors') };
    } catch (e) { return { status: 'error', error: createErrorObject(e.message, 500) }; }
}

export async function getPromoPoems() {
    try {
        const html = await fetchHtml(BASE_URL);
        const $ = cheerio.load(html);
        const poems = [];
        $('.card-recomended-proizv .border-bottom').each((_, el) => {
            const link = $(el).find('span.link');
            const id = parseInt(link.attr('data-proizvid'), 10);
            
            const authorDiv = $(el).find('.small.text-right');
            const authorUsername = authorDiv.text().trim();
            const authorLinkElement = authorDiv.find('a');
            
            let authorProfileUrl = `${BASE_URL}/avtor/${encodeURIComponent(authorUsername)}`;
            if (authorLinkElement.length > 0) {
                const href = authorLinkElement.attr('href');
                if (href) authorProfileUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            }

            // Парсинг лайков и комментариев (исправлено)
            let rating = null;
            let commentsCount = null;
            $(el).find('span.text-nowrap.small').each((_, span) => {
                const icon = $(span).find('i');
                const text = $(span).text().trim();
                const value = parseInt(text, 10);
                if (icon.hasClass('fa-heart-o') || icon.hasClass('fa-heart')) {
                    rating = isNaN(value) ? 0 : value;
                } else if (icon.hasClass('fa-comments-o')) {
                    commentsCount = isNaN(value) ? 0 : value;
                }
            });

            poems.push({
                id: id,
                title: link.text().trim(),
                authorUsername: authorUsername,
                authorProfileUrl: authorProfileUrl,
                rating: rating,
                commentsCount: commentsCount,
                url: `${BASE_URL}/proizv/${id}`
            });
        });
        return { status: 'success', data: poems };
    } catch (e) { return { status: 'error', error: createErrorObject(e.message, 500) }; }
}


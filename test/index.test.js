import test from 'node:test';
import assert from 'node:assert';
import {
    getAuthorData,
    getAuthorFilters,
    getRecommendedAuthors,
    getPromoPoems,
    getWeeklyRatedAuthors,
    getActiveAuthors,
    getPoemById
} from '../index.js';

const TEST_AUTHOR_USERNAME = 'oreh-orehov';
const TEST_AUTHOR_ID = 14260;
const TEST_AUTHOR_SUBDOMAIN_URL = `https://${TEST_AUTHOR_USERNAME}.stihirus.ru/`;
const TEST_AUTHOR_PATH_URL = `https://stihirus.ru/avtor/${TEST_AUTHOR_USERNAME}`;

const TEST_AUTHOR_WITH_HEADER_ID = 1; // vitaminka
const TEST_AUTHOR_WITH_PREMIUM_ID = 14381; // olesya-rassmatova

const TEST_POEM_ID = 317868; // Глупый Мудрец by oreh-orehov
const TEST_POEM_ID_404 = 999999999;

const NON_EXISTENT_AUTHOR_ID = 99999999;
const INVALID_IDENTIFIER_SPACES = 'invalid identifier with spaces';
const TEST_TIMEOUT = 30000;
const SHORT_DELAY = 100;

function isValidUrlOrNull(url) {
    if (url === null) return true;
    if (typeof url !== 'string') return false;
    try {
        new URL(url);
        return url.startsWith('http');
    } catch (_) {
        return false;
    }
}

test('getAuthorData', { timeout: TEST_TIMEOUT * 6 }, async (t) => {

    await t.test('should fetch profile only (page = 0)', async () => {
        const response = await getAuthorData(TEST_AUTHOR_USERNAME, 0);
        assert.strictEqual(response.status, 'success');
        const d = response.data;
        assert.ok(d, 'Data exists');
        assert.strictEqual(d.authorId, TEST_AUTHOR_ID);
        assert.strictEqual(d.canonicalUsername, TEST_AUTHOR_USERNAME);
        assert.ok(d.username);
        assert.ok(isValidUrlOrNull(d.profileUrl));
        assert.ok(d.stats);
        assert.strictEqual(typeof d.stats.poems, 'number');
        assert.ok(Array.isArray(d.collections));
        assert.ok(d.collections.length > 0);
        d.collections.forEach(col => {
            assert.ok(typeof col.name === 'string' && col.name.length > 0);
            assert.ok(isValidUrlOrNull(col.url));
        });
        assert.ok(Array.isArray(d.poems));
        assert.strictEqual(d.poems.length, 0);
        assert.ok(d.description?.length > 0);
        assert.ok(isValidUrlOrNull(d.avatarUrl));
        assert.strictEqual(d.headerUrl, null);
        assert.ok(d.status?.length > 0);
        assert.ok(d.lastVisit?.length > 0);
        assert.strictEqual(typeof d.isPremium, 'boolean');
        assert.strictEqual(d.isPremium, false);
    });

     await t.test('should fetch author with premium status', async () => {
        const response = await getAuthorData(TEST_AUTHOR_WITH_PREMIUM_ID, 0);
        assert.strictEqual(response.status, 'success');
        assert.ok(response.data);
        assert.strictEqual(response.data.authorId, TEST_AUTHOR_WITH_PREMIUM_ID);
        assert.strictEqual(response.data.isPremium, true);
    });

    await t.test('should fetch poems with new fields (page = 1)', async () => {
        const response = await getAuthorData(TEST_AUTHOR_ID, 1);
        assert.strictEqual(response.status, 'success');
        assert.ok(response.data.poems.length > 0);
        const poem = response.data.poems[0];
        assert.ok(poem, 'Poem object exists');
        assert.ok(Array.isArray(poem.gifts), 'Gifts should be an array');
        assert.ok([-1, 0, 1].includes(poem.uniquenessStatus), 'Uniqueness status is invalid');
        assert.ok(poem.contest === null || typeof poem.contest === 'object', 'Contest field format invalid');
        if(poem.contest) {
            assert.strictEqual(typeof poem.contest.id, 'number');
            assert.strictEqual(typeof poem.contest.name, 'string');
        }
        assert.ok(poem.holidaySection === null || typeof poem.holidaySection === 'object', 'Holiday section field format invalid');
         if(poem.holidaySection) {
            assert.strictEqual(typeof poem.holidaySection.id, 'number');
            assert.ok(isValidUrlOrNull(poem.holidaySection.url));
            assert.strictEqual(typeof poem.holidaySection.title, 'string');
        }
        assert.ok(isValidUrlOrNull(poem.rubric.url), 'Rubric URL format invalid');
        assert.ok(isValidUrlOrNull(poem.imageUrl), 'Image URL format invalid');
        assert.strictEqual(typeof poem.hasCertificate, 'boolean');
    });

    await t.test('should fetch filtered poems by rubricId', async () => {
        const filterOptions = { rubricId: 5 };
        const response = await getAuthorData(TEST_AUTHOR_ID, null, SHORT_DELAY, null, null, filterOptions);
        assert.strictEqual(response.status, 'success');
        assert.ok(response.data.poems.length > 0, 'Should find poems in rubric 5');
        assert.ok(response.data.poems.length < response.data.stats.poems, 'Filtered list should be smaller than total');
        response.data.poems.forEach(poem => {
            assert.strictEqual(poem.rubric.name, 'Пейзажная лирика', `Poem ${poem.id} has wrong rubric`);
        });
    });

     await t.test('should fetch filtered poems by date', async () => {
        const filterOptions = { year: 2025, month: 3 };
        const response = await getAuthorData(TEST_AUTHOR_ID, null, SHORT_DELAY, null, null, filterOptions);
        assert.strictEqual(response.status, 'success');
        assert.ok(response.data.poems.length > 0, 'Should find poems in March 2025');
        assert.ok(response.data.poems.length <= response.data.stats.poems, 'Filtered list should be <= total');
        response.data.poems.forEach(poem => {
            assert.ok(poem.created.includes('.03.2025'), `Poem ${poem.id} has wrong date: ${poem.created}`);
        });
    });

     await t.test('should return empty poems for non-matching filter', async () => {
        const filterOptions = { rubricId: 999 };
        const response = await getAuthorData(TEST_AUTHOR_ID, null, SHORT_DELAY, null, null, filterOptions);
        assert.strictEqual(response.status, 'success');
        assert.strictEqual(response.data.poems.length, 0, 'Should find no poems in rubric 999');
    });

    await t.test('should fetch profile and all poems (page = null)', { timeout: TEST_TIMEOUT * 2 }, async () => {
        const response = await getAuthorData(TEST_AUTHOR_USERNAME, null, SHORT_DELAY);
        assert.strictEqual(response.status, 'success');
        assert.ok(response.data.poems.length > 0);
        assert.ok(Math.abs(response.data.stats.poems - response.data.poems.length) <= 5);
    });
    await t.test('should return error for non-existent author ID', async () => {
        const response = await getAuthorData(NON_EXISTENT_AUTHOR_ID);
        assert.strictEqual(response.status, 'error');
        assert.strictEqual(response.error.code, 404);
    });
     await t.test('should return error for invalid identifier format', async () => {
        const response = await getAuthorData(INVALID_IDENTIFIER_SPACES);
        assert.strictEqual(response.status, 'error');
        assert.strictEqual(response.error.code, 400);
    });
});

test('getAuthorFilters', { timeout: TEST_TIMEOUT }, async (t) => {
     await t.test('should fetch filters for a valid author', async () => {
        const response = await getAuthorFilters(TEST_AUTHOR_USERNAME);
        assert.strictEqual(response.status, 'success');
        assert.ok(response.data);
        assert.ok(Array.isArray(response.data.rubrics) && response.data.rubrics.length > 0);
        assert.ok(Array.isArray(response.data.dates) && response.data.dates.length > 0);
    });
     await t.test('should return error for non-existent author ID', async () => {
        const response = await getAuthorFilters(NON_EXISTENT_AUTHOR_ID);
        assert.strictEqual(response.status, 'error');
        assert.strictEqual(response.error.code, 404);
    });
});

test('Homepage Functions', { timeout: TEST_TIMEOUT * 4 }, async (t) => {
    await t.test('getRecommendedAuthors', async () => {
        const response = await getRecommendedAuthors();
        assert.strictEqual(response.status, 'success');
        assert.ok(Array.isArray(response.data));
        assert.ok(response.data.length > 0, 'Expected some recommended authors');
        response.data.forEach(author => {
            assert.ok(author.username);
            assert.ok(author.canonicalUsername);
            assert.ok(isValidUrlOrNull(author.profileUrl));
            assert.ok(isValidUrlOrNull(author.avatarUrl));
            assert.ok(author.poemsCount === null || typeof author.poemsCount === 'number');
        });
    });

    await t.test('getPromoPoems', async () => {
        const response = await getPromoPoems();
        assert.strictEqual(response.status, 'success');
        assert.ok(Array.isArray(response.data));
        assert.ok(response.data.length > 0, 'Expected some promo poems');
        response.data.forEach(poem => {
            assert.strictEqual(typeof poem.id, 'number');
            assert.ok(poem.title);
            assert.ok(isValidUrlOrNull(poem.url));
            assert.ok(poem.authorUsername);
            assert.ok(isValidUrlOrNull(poem.authorProfileUrl));
            assert.ok(poem.rating === null || typeof poem.rating === 'number');
            assert.ok(poem.commentsCount === null || typeof poem.commentsCount === 'number');
        });
    });

    await t.test('getWeeklyRatedAuthors', async () => {
        const response = await getWeeklyRatedAuthors();
        assert.strictEqual(response.status, 'success');
        assert.ok(Array.isArray(response.data));
        assert.ok(response.data.length > 0, 'Expected some weekly rated authors');
         response.data.forEach(author => {
            assert.ok(author.username);
            assert.ok(author.canonicalUsername);
            assert.ok(isValidUrlOrNull(author.profileUrl));
            assert.ok(isValidUrlOrNull(author.avatarUrl));
            assert.ok(author.rating === null || typeof author.rating === 'number');
        });
    });

    await t.test('getActiveAuthors', async () => {
        const response = await getActiveAuthors();
        assert.strictEqual(response.status, 'success');
        assert.ok(Array.isArray(response.data));
        assert.ok(response.data.length > 0, 'Expected some active authors');
         response.data.forEach(author => {
            assert.ok(author.username);
            assert.ok(author.canonicalUsername);
            assert.ok(isValidUrlOrNull(author.profileUrl));
            assert.ok(isValidUrlOrNull(author.avatarUrl));
            assert.ok(author.poemsCount === null || typeof author.poemsCount === 'number');
        });
    });
});

test('getPoemById', { timeout: TEST_TIMEOUT }, async (t) => {
     await t.test('should fetch a valid poem', async () => {
        const response = await getPoemById(TEST_POEM_ID);
        assert.strictEqual(response.status, 'success');
        assert.ok(response.data);
        const poem = response.data;
        assert.strictEqual(poem.id, TEST_POEM_ID);
        assert.ok(poem.title);
        assert.ok(poem.text);
        assert.ok(poem.created);
        assert.ok(poem.rubric);
        assert.ok(poem.author);
        assert.strictEqual(poem.author.id, TEST_AUTHOR_ID);
        assert.ok(poem.author.username);
        assert.ok(isValidUrlOrNull(poem.author.profileUrl));
        assert.ok(typeof poem.rating === 'number');
        assert.ok(typeof poem.commentsCount === 'number');
        assert.ok(isValidUrlOrNull(poem.imageUrl));
        assert.strictEqual(typeof poem.hasCertificate, 'boolean');
        assert.ok(Array.isArray(poem.gifts));
        assert.ok([-1, 0, 1].includes(poem.uniquenessStatus));
        assert.ok(poem.contest === null || typeof poem.contest === 'object');
        assert.ok(poem.holidaySection === null || typeof poem.holidaySection === 'object');
    });

     await t.test('should return 404 for non-existent poem ID', async () => {
        const response = await getPoemById(TEST_POEM_ID_404);
        assert.strictEqual(response.status, 'error');
        assert.ok(response.error);
        assert.strictEqual(response.error.code, 404);
    });

     await t.test('should return error for invalid poem ID', async () => {
        // @ts-ignore
        const response = await getPoemById(-1);
        assert.strictEqual(response.status, 'error');
        assert.ok(response.error);
        assert.strictEqual(response.error.code, 400);
    });
});
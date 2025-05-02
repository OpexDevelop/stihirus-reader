import test from 'node:test';
import assert from 'node:assert';
import { getAuthorData, getAuthorFilters } from '../index.js';

const TEST_AUTHOR_USERNAME = 'oreh-orehov';
const TEST_AUTHOR_ID = 14260;
const TEST_AUTHOR_SUBDOMAIN_URL = `https://${TEST_AUTHOR_USERNAME}.stihirus.ru/`;
const TEST_AUTHOR_PATH_URL = `https://stihirus.ru/avtor/${TEST_AUTHOR_USERNAME}`;

const TEST_AUTHOR_WITH_HEADER_ID = 1;
const TEST_AUTHOR_WITH_HEADER_USERNAME = 'vitaminka';

const TEST_AUTHOR_2_USERNAME = 'olesya-rassmatova';
const TEST_AUTHOR_2_ID = 14381;

const NON_EXISTENT_AUTHOR_ID = 99999999;
const INVALID_IDENTIFIER_SPACES = 'invalid identifier with spaces';
const INVALID_IDENTIFIER_SYMBOLS = '!@#$%^';
const INVALID_URL_FORMAT = 'ftp://example.com/not/stihirus';
const TEST_TIMEOUT = 30000;
const SHORT_DELAY = 100;

test('getAuthorData', { timeout: TEST_TIMEOUT * 6 }, async (t) => {

    await t.test('should fetch profile only (page = 0) using username', async () => {
        const response = await getAuthorData(TEST_AUTHOR_USERNAME, 0);
        assert.strictEqual(response.status, 'success', 'Response status should be success');
        assert.ok(response.data, 'Response should contain data');
        assert.strictEqual(response.data.authorId, TEST_AUTHOR_ID, 'Author ID should match');
        assert.strictEqual(response.data.canonicalUsername, TEST_AUTHOR_USERNAME, 'Canonical username should match');
        assert.ok(response.data.username, 'Username should exist');
        assert.ok(response.data.profileUrl, 'Profile URL should exist');
        assert.ok(response.data.stats, 'Stats should exist');
        assert.ok(typeof response.data.stats.poems === 'number', 'Stats poems count should be a number');
        assert.ok(Array.isArray(response.data.collections), 'Collections should be an array');
        assert.ok(response.data.collections.length > 0, 'Collections should not be empty for this author');
        response.data.collections.forEach(col => {
            assert.ok(typeof col.name === 'string' && col.name.length > 0, 'Collection name should be a non-empty string');
            assert.ok(typeof col.url === 'string' && col.url.startsWith('https://stihirus.ru/sbornik/'), 'Collection URL should be a valid string');
        });
        assert.ok(Array.isArray(response.data.poems), 'Poems should be an array');
        assert.strictEqual(response.data.poems.length, 0, 'Poems array should be empty for page 0');
        assert.ok(response.data.description?.length > 0, 'Description should be fetched');
        assert.ok(response.data.avatarUrl?.startsWith('https://'), 'Avatar URL should be valid');
        assert.strictEqual(response.data.headerUrl, null, 'Header URL should be null for this author');
        assert.ok(response.data.status?.length > 0, 'Status should be fetched');
        assert.ok(response.data.lastVisit?.length > 0, 'Last visit should be fetched');
    });

    await t.test('should fetch profile and first page (page = 1) using ID', async () => {
        const response = await getAuthorData(TEST_AUTHOR_ID, 1);
        assert.strictEqual(response.status, 'success', 'Response status should be success');
        assert.ok(response.data, 'Response should contain data');
        assert.strictEqual(response.data.authorId, TEST_AUTHOR_ID, 'Author ID should match');
        assert.ok(response.data.canonicalUsername, 'Canonical username should exist');
        assert.ok(Array.isArray(response.data.poems), 'Poems should be an array');
        assert.ok(response.data.poems.length > 0, 'Poems array should not be empty for page 1');
        assert.ok(response.data.poems.length <= 20, 'Poems array length should be <= 20 for page 1');
        response.data.poems.forEach(poem => {
            assert.ok(typeof poem.id === 'number', 'Poem ID should be a number');
            assert.ok(typeof poem.title === 'string', 'Poem title should be a string');
            assert.ok(typeof poem.text === 'string', 'Poem text should be a string');
            assert.ok(typeof poem.created === 'string', 'Poem created date should be a string');
            assert.ok(poem.rubric && typeof poem.rubric.name === 'string', 'Poem rubric name should be a string');
             assert.ok(poem.rubric.url === null || (typeof poem.rubric.url === 'string' && poem.rubric.url.startsWith('https://stihirus.ru/razdel/')), 'Rubric URL format is invalid');
             assert.ok(poem.collection === null || typeof poem.collection === 'string', 'Collection format is invalid');
             assert.ok(typeof poem.rating === 'number', 'Rating should be a number');
             assert.ok(typeof poem.commentsCount === 'number', 'Comments count should be a number');
             assert.ok(poem.imageUrl === null || (typeof poem.imageUrl === 'string' && poem.imageUrl.startsWith('https://')), 'Image URL format is invalid');
             assert.ok(typeof poem.hasCertificate === 'boolean', 'hasCertificate should be a boolean');
        });
    });

    await t.test('should fetch profile and all poems (page = null) using subdomain URL', { timeout: TEST_TIMEOUT * 2 }, async () => {
        const response = await getAuthorData(TEST_AUTHOR_SUBDOMAIN_URL, null, SHORT_DELAY);
        assert.strictEqual(response.status, 'success', 'Response status should be success');
        assert.ok(response.data, 'Response should contain data');
        assert.strictEqual(response.data.authorId, TEST_AUTHOR_ID, 'Author ID should match');
        assert.strictEqual(response.data.canonicalUsername, TEST_AUTHOR_USERNAME, 'Canonical username should match');
        assert.ok(Array.isArray(response.data.poems), 'Poems should be an array');
        const poemsInStats = response.data.stats.poems;
        const poemsFetched = response.data.poems.length;
        assert.ok(poemsFetched > 0, 'Fetched poems count should be greater than 0');
        assert.ok(Math.abs(poemsInStats - poemsFetched) <= 5, `Fetched poems (${poemsFetched}) should be close to stats count (${poemsInStats})`);
    });

     await t.test('should fetch profile using path URL', async () => {
        const response = await getAuthorData(TEST_AUTHOR_PATH_URL, 0);
        assert.strictEqual(response.status, 'success', 'Response status should be success');
        assert.ok(response.data, 'Response should contain data');
        assert.strictEqual(response.data.authorId, TEST_AUTHOR_ID, 'Author ID should match');
        assert.strictEqual(response.data.canonicalUsername, TEST_AUTHOR_USERNAME, 'Canonical username should match');
        assert.strictEqual(response.data.poems.length, 0, 'Poems array should be empty for page 0');
    });

    await t.test('should return error for non-existent author ID', async () => {
        const response = await getAuthorData(NON_EXISTENT_AUTHOR_ID);
        assert.strictEqual(response.status, 'error', 'Response status should be error');
        assert.ok(response.error, 'Response should contain error details');
        assert.strictEqual(response.error.code, 404, 'Error code should be 404 (Not Found)');
        assert.ok(response.error.message.includes(String(NON_EXISTENT_AUTHOR_ID)) || response.error.message.toLowerCase().includes('not found') || response.error.message.includes('could not fetch'), 'Error message should indicate not found');
    });

    await t.test('should return error for invalid identifier format (spaces)', async () => {
        const response = await getAuthorData(INVALID_IDENTIFIER_SPACES);
        assert.strictEqual(response.status, 'error', 'Response status should be error for spaces');
        assert.ok(response.error, 'Response should contain error details for spaces');
        assert.strictEqual(response.error.code, 400, 'Error code should be 400 (Invalid Input) for spaces');
        assert.ok(response.error.message.toLowerCase().includes('invalid identifier format'), 'Error message should indicate invalid format for spaces');
    });

    await t.test('should return error for invalid identifier format (symbols)', async () => {
        const response = await getAuthorData(INVALID_IDENTIFIER_SYMBOLS);
        assert.strictEqual(response.status, 'error', 'Response status should be error for symbols');
        assert.ok(response.error, 'Response should contain error details for symbols');
        assert.strictEqual(response.error.code, 400, 'Error code should be 400 (Invalid Input) for symbols');
        assert.ok(response.error.message.toLowerCase().includes('invalid identifier format'), 'Error message should indicate invalid format for symbols');
    });

     await t.test('should return error for unrecognized URL format', async () => {
        const response = await getAuthorData(INVALID_URL_FORMAT);
        assert.strictEqual(response.status, 'error', 'Response status should be error for bad URL');
        assert.ok(response.error, 'Response should contain error details for bad URL');
        assert.strictEqual(response.error.code, 400, 'Error code should be 400 (Invalid Input) for bad URL');
        assert.ok(response.error.message.toLowerCase().includes('unrecognized url format'), 'Error message should indicate unrecognized URL');
    });

    await t.test('should return error for invalid page number (negative)', async () => {
        const response = await getAuthorData(TEST_AUTHOR_USERNAME, -1);
        assert.strictEqual(response.status, 'error', 'Response status should be error');
        assert.ok(response.error, 'Response should contain error details');
        assert.strictEqual(response.error.code, 400, 'Error code should be 400 (Invalid Input)');
        assert.ok(response.error.message.toLowerCase().includes('invalid page parameter'), 'Error message should indicate invalid page');
    });

     await t.test('should return error for invalid page number (non-integer)', async () => {
        const response = await getAuthorData(TEST_AUTHOR_USERNAME, 1.5);
        assert.strictEqual(response.status, 'error', 'Response status should be error');
        assert.ok(response.error, 'Response should contain error details');
        assert.strictEqual(response.error.code, 400, 'Error code should be 400 (Invalid Input)');
        assert.ok(response.error.message.toLowerCase().includes('invalid page parameter'), 'Error message should indicate invalid page');
    });

     await t.test('should handle fetching an out-of-bounds page gracefully', async () => {
        const profileResponse = await getAuthorData(TEST_AUTHOR_ID, 0);
        assert.strictEqual(profileResponse.status, 'success');
        const totalPoems = profileResponse.data.stats.poems;
        const outOfBoundsPage = Math.ceil(totalPoems / 20) + 5;

        const response = await getAuthorData(TEST_AUTHOR_ID, outOfBoundsPage);
        assert.strictEqual(response.status, 'success', 'Response status should be success even for out-of-bounds page');
        assert.ok(response.data, 'Response should contain data');
        assert.strictEqual(response.data.authorId, TEST_AUTHOR_ID, 'Author ID should match');
        assert.ok(Array.isArray(response.data.poems), 'Poems should be an array');
        assert.strictEqual(response.data.poems.length, 0, 'Poems array should be empty for an out-of-bounds page');
    });

    await t.test('should fetch author with header image correctly', async () => {
        const response = await getAuthorData(TEST_AUTHOR_WITH_HEADER_ID, 0);
        assert.strictEqual(response.status, 'success', 'Response status should be success');
        assert.ok(response.data, 'Response should contain data');
        assert.strictEqual(response.data.authorId, TEST_AUTHOR_WITH_HEADER_ID, 'Author ID should match');
        assert.ok(response.data.headerUrl?.startsWith('https://'), 'Header URL should be valid');
        assert.ok(response.data.avatarUrl?.startsWith('https://'), 'Avatar URL should be valid');
    });

});


test('getAuthorFilters', { timeout: TEST_TIMEOUT }, async (t) => {

    await t.test('should fetch filters for a valid author (oreh-orehov)', async () => {
        const response = await getAuthorFilters(TEST_AUTHOR_USERNAME);
        assert.strictEqual(response.status, 'success', 'Response status should be success');
        assert.ok(response.data, 'Response should contain filter data');

        assert.ok(Array.isArray(response.data.rubrics), 'Rubrics should be an array');
        assert.ok(response.data.rubrics.length > 0, 'Rubrics array should not be empty');
        response.data.rubrics.forEach(rubric => {
            assert.strictEqual(typeof rubric.id, 'number', 'Rubric ID should be a number');
            assert.strictEqual(typeof rubric.name, 'string', 'Rubric name should be a string');
            assert.ok(rubric.name.length > 0, 'Rubric name should not be empty');
            assert.strictEqual(typeof rubric.count, 'number', 'Rubric count should be a number');
            assert.ok(rubric.count >= 0, 'Rubric count should be non-negative');
        });

        assert.ok(Array.isArray(response.data.dates), 'Dates should be an array');
        assert.ok(response.data.dates.length > 0, 'Dates array should not be empty');
         response.data.dates.forEach(date => {
            assert.strictEqual(typeof date.year, 'number', 'Date year should be a number');
            assert.ok(date.year > 2000, 'Date year seems invalid');
            assert.strictEqual(typeof date.month, 'number', 'Date month should be a number');
            assert.ok(date.month >= 1 && date.month <= 12, 'Date month should be between 1 and 12');
            assert.strictEqual(typeof date.count, 'number', 'Date count should be a number');
            assert.ok(date.count >= 0, 'Date count should be non-negative');
        });
    });

     await t.test('should fetch filters for another valid author (olesya-rassmatova)', async () => {
        const response = await getAuthorFilters(TEST_AUTHOR_2_ID);
        assert.strictEqual(response.status, 'success', 'Response status should be success');
        assert.ok(response.data, 'Response should contain filter data');
        assert.ok(Array.isArray(response.data.rubrics), 'Rubrics should be an array');
        assert.ok(response.data.rubrics.length > 0, 'Rubrics array should not be empty');
        assert.ok(Array.isArray(response.data.dates), 'Dates should be an array');
        assert.ok(response.data.dates.length > 0, 'Dates array should not be empty');
    });

    await t.test('should return error for non-existent author ID', async () => {
        const response = await getAuthorFilters(NON_EXISTENT_AUTHOR_ID);
        assert.strictEqual(response.status, 'error', 'Response status should be error');
        assert.ok(response.error, 'Response should contain error details');
        assert.strictEqual(response.error.code, 404, 'Error code should be 404 (Not Found)');
    });

    await t.test('should return error for invalid identifier format', async () => {
        const response = await getAuthorFilters(INVALID_IDENTIFIER_SPACES);
        assert.strictEqual(response.status, 'error', 'Response status should be error');
        assert.ok(response.error, 'Response should contain error details');
        assert.strictEqual(response.error.code, 400, 'Error code should be 400 (Invalid Input)');
    });
});
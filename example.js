// This example demonstrates usage in a Node.js environment.
// For browser usage, see the README.md instructions.
import { getAuthorData, getAuthorFilters } from './index.js'; // Import from local file for testing/example

// --- CONFIGURATION ---
const AUTHOR_IDENTIFIER = 'oreh-orehov'; // Or ID like 14260, or URL like 'https://...'
const PAGE_TO_FETCH = 1; // null = all pages, 0 = profile only, N > 0 = page N
const REQUEST_DELAY_MS = 500; // Delay between requests when fetching all pages
// --- END CONFIGURATION ---

async function runNodeExample(identifier, page = null, delay = 500) {
    console.log(`\n--- [Node.js] Fetching data for: ${identifier} | Page: ${page === null ? 'All' : page} ---`);
    try {
        // Fetch main author data
        // When running locally, proxy parameters are not needed
        const response = await getAuthorData(identifier, page, delay);

        console.log("\n=== Author Data Response ===");
        if (response.status === 'success') {
            const d = response.data;
            console.log(`Status: ${response.status}`);
            console.log(`Author: ${d.username} (ID: ${d.authorId})`);
            console.log(`Canonical Username: ${d.canonicalUsername}`);
            console.log(`Profile URL: ${d.profileUrl}`);
            console.log(`Status: ${d.status}`);
            console.log(`Last Visit: ${d.lastVisit}`);
            console.log(`Avatar URL: ${d.avatarUrl || 'N/A'}`);
            console.log(`Header URL: ${d.headerUrl || 'N/A'}`);
            console.log(`Description:\n${d.description || '(No description)'}`);
            console.log(`Stats: ${JSON.stringify(d.stats)}`);
            console.log(`Collections (${d.collections.length}):`);
            console.log(d.collections.length > 0 ? JSON.stringify(d.collections, null, 2) : '(No collections)');
            console.log(`Poems received: ${d.poems.length}`);
            if (d.poems.length > 0) {
                console.log(`--- First Poem Details ---`);
                // Log only the first poem object fully
                console.log(JSON.stringify(d.poems[0], null, 2));
                if (d.poems.length > 1) {
                    console.log(`(${d.poems.length - 1} more poems received but not fully displayed here)`);
                }
            } else {
                 console.log(`(No poems found for page: ${page})`);
            }
        } else {
            console.error(`Status: ${response.status}`);
            console.error(`ERROR fetching data: ${response.error.message} (Code: ${response.error.code})`);
            if (response.error.originalMessage) console.error(`Original Error: ${response.error.originalMessage}`);
            console.error("Full error object:", JSON.stringify(response.error, null, 2));
        }

        // Fetch available filters
        console.log(`\n--- [Node.js] Fetching filters for: ${identifier} ---`);
        // When running locally, proxy parameters are not needed
        const filtersResponse = await getAuthorFilters(identifier);

        console.log("\n=== Filters Response ===");
        if (filtersResponse.status === 'success') {
            const f = filtersResponse.data;
            console.log(`Status: ${filtersResponse.status}`);
            console.log(`Available Rubric Filters (${f.rubrics.length}):`);
            console.log(f.rubrics.length > 0 ? JSON.stringify(f.rubrics, null, 2) : '(No rubric filters)');
            console.log(`\nAvailable Date Filters (${f.dates.length}):`);
            console.log(f.dates.length > 0 ? JSON.stringify(f.dates, null, 2) : '(No date filters)');
        } else {
             console.error(`Status: ${filtersResponse.status}`);
             console.error(`ERROR fetching filters: ${filtersResponse.error.message} (Code: ${filtersResponse.error.code})`);
            if (filtersResponse.error.originalMessage) console.error(`Original Error: ${filtersResponse.error.originalMessage}`);
            console.error("Full error object:", JSON.stringify(filtersResponse.error, null, 2));
        }

    } catch (error) {
        console.error(`\n!!! UNEXPECTED SCRIPT ERROR for ${identifier}:`, error);
    } finally {
        console.log(`\n--- Fetching finished for: ${identifier} ---`);
    }
}

async function main() {
    await runNodeExample(AUTHOR_IDENTIFIER, PAGE_TO_FETCH, REQUEST_DELAY_MS);

    // Example with another author (fetching only profile)
    // await runNodeExample('olesya-rassmatova', 0);

    // Example with non-existent author
    // await runNodeExample(99999999, 0);
}

// Run the main function when the script is executed
main();
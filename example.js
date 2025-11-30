import {
    getAuthorData,
    getAuthorFilters,
    getRecommendedAuthors,
    getPromoPoems,
    getWeeklyRatedAuthors,
    getActiveAuthors,
    getPoemById
} from './index.js';

const AUTHOR_IDENTIFIER = 'oreh-orehov';
const POEM_ID_TO_FETCH = 317868;
const PAGE_TO_FETCH = 1;
const REQUEST_DELAY_MS = 500;

async function runAllExamples() {
    console.log("=============================================");
    console.log("          StihiRus Reader Examples         ");
    console.log("=============================================");

    console.log(`\n--- 1. Fetching Author Data for: ${AUTHOR_IDENTIFIER} (Page: ${PAGE_TO_FETCH}) ---`);
    try {
        const response = await getAuthorData(AUTHOR_IDENTIFIER, PAGE_TO_FETCH, REQUEST_DELAY_MS);
        if (response.status === 'success') {
            console.log("Status: success");
            console.log("Author Data:", JSON.stringify(response.data, null, 2));
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getAuthorData):", error);
    }

    console.log(`\n--- 2. Fetching Filtered Author Data for: ${AUTHOR_IDENTIFIER} (Rubric ID: 5) ---`);
    try {
        const filterOptions = { rubricId: 5 };
        const response = await getAuthorData(AUTHOR_IDENTIFIER, null, REQUEST_DELAY_MS, filterOptions);
        if (response.status === 'success') {
            console.log("Status: success");
            console.log(`Filtered Poems Count: ${response.data.poems.length}`);
            if (response.data.poems.length > 0) {
                console.log("First Filtered Poem:", JSON.stringify(response.data.poems[0], null, 2));
            }
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getAuthorData - Filtered):", error);
    }

    console.log(`\n--- 3. Fetching Filters for: ${AUTHOR_IDENTIFIER} ---`);
    try {
        const response = await getAuthorFilters(AUTHOR_IDENTIFIER);
        if (response.status === 'success') {
            console.log("Status: success");
            console.log("Filters Data:", JSON.stringify(response.data, null, 2));
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getAuthorFilters):", error);
    }

    console.log(`\n--- 4. Fetching Recommended Authors ---`);
    try {
        const response = await getRecommendedAuthors();
        if (response.status === 'success') {
            console.log("Status: success");
            console.log(`Found ${response.data.length} recommended authors.`);
            console.log("Recommended Authors (first 5):", JSON.stringify(response.data.slice(0, 5), null, 2));
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getRecommendedAuthors):", error);
    }

    console.log(`\n--- 5. Fetching Promo Poems ---`);
    try {
        const response = await getPromoPoems();
        if (response.status === 'success') {
            console.log("Status: success");
            console.log(`Found ${response.data.length} promo poems.`);
            console.log("Promo Poems (first 5):", JSON.stringify(response.data.slice(0, 5), null, 2));
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getPromoPoems):", error);
    }

    console.log(`\n--- 6. Fetching Weekly Rated Authors ---`);
    try {
        const response = await getWeeklyRatedAuthors();
        if (response.status === 'success') {
            console.log("Status: success");
            console.log(`Found ${response.data.length} weekly rated authors.`);
            console.log("Weekly Rated Authors (first 5):", JSON.stringify(response.data.slice(0, 5), null, 2));
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getWeeklyRatedAuthors):", error);
    }

    console.log(`\n--- 7. Fetching Active Authors ---`);
    try {
        const response = await getActiveAuthors();
        if (response.status === 'success') {
            console.log("Status: success");
            console.log(`Found ${response.data.length} active authors.`);
            console.log("Active Authors (first 5):", JSON.stringify(response.data.slice(0, 5), null, 2));
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getActiveAuthors):", error);
    }

    console.log(`\n--- 8. Fetching Poem By ID: ${POEM_ID_TO_FETCH} ---`);
    try {
        const response = await getPoemById(POEM_ID_TO_FETCH);
        if (response.status === 'success') {
            console.log("Status: success");
            console.log("Poem Data:", JSON.stringify(response.data, null, 2));
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }
    } catch (error) {
        console.error("!!! UNEXPECTED SCRIPT ERROR (getPoemById):", error);
    }

    console.log("\n=============================================");
    console.log("              Examples Finished              ");
    console.log("=============================================");
}

runAllExamples();

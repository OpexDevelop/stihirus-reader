/**
 * Author statistics.
 */
export interface StihirusAuthorStats {
    /** Total number of poems (from profile HTML). */
    poems: number;
    /** Number of reviews sent. */
    reviewsSent: number;
    /** Number of reviews received. */
    reviewsReceived: number;
}

/**
 * Author's collection info.
 */
export interface StihirusCollectionInfo {
    /** Collection name. */
    name: string;
    /** Full URL to the collection. */
    url: string;
}

/**
 * Poem rubric (genre).
 */
export interface StihirusPoemRubric {
    /** Rubric name. */
    name: string;
    /** Full URL to the rubric page, or null if it's 'Произведения без рубрики' or similar. */
    url: string | null;
}

/**
 * A single poem.
 */
export interface StihirusPoem {
    /** Unique ID. */
    id: number;
    /** Title (or '***'). */
    title: string;
    /** Full text. */
    text: string;
    /** Creation date/time string (e.g., "27.03.2025 20:19"). */
    created: string;
    /** Rubric details. */
    rubric: StihirusPoemRubric;
    /** Author's collection name, or null. */
    collection: string | null;
    /** Likes count. */
    rating: number;
    /** Comments count. */
    commentsCount: number;
    /** URL to poem's image, or null. */
    imageUrl: string | null;
    /** Whether it has a certificate. */
    hasCertificate: boolean;
}

/**
 * Complete author data structure.
 */
export interface StihirusAuthorData {
    /** Author's unique ID. */
    authorId: number;
    /** Display name (from HTML). */
    username: string;
    /** URL used to fetch the HTML profile. */
    profileUrl: string;
    /** Username used in URLs/API (derived from identifier). */
    canonicalUsername: string;
    /** Profile description. */
    description: string;
    /** Avatar URL, or null. */
    avatarUrl: string | null;
    /** Profile header image URL, or null. */
    headerUrl: string | null;
    /** Author status (e.g., 'новенький'). */
    status: string;
    /** Last visit time text (e.g., '5 минут назад'). */
    lastVisit: string;
    /** Author statistics. `poems` count reflects total poems from profile. */
    stats: StihirusAuthorStats;
    /** Array of author's collections. */
    collections: StihirusCollectionInfo[];
    /**
     * Array of author's poems. Content depends on the `page` parameter used:
     * - `page = null`: Contains all poems.
     * - `page = 0`: Empty array.
     * - `page = N`: Contains poems from the N-th page (might be empty if page is out of bounds or API fails).
     */
    poems: StihirusPoem[];
}

/**
 * Error object structure.
 */
export interface StihirusError {
    /** HTTP status or custom error code. */
    code: number;
    /** Error message. */
    message: string;
    /** Optional underlying error message. */
    originalMessage?: string;
}

/**
 * Successful response structure for `getAuthorData`.
 */
export interface StihirusSuccessResponse {
    status: 'success';
    data: StihirusAuthorData;
}

/**
 * Error response structure.
 */
export interface StihirusErrorResponse {
    status: 'error';
    error: StihirusError;
}

/**
 * Possible response types from `getAuthorData`.
 */
export type StihirusResponse = StihirusSuccessResponse | StihirusErrorResponse;

/**
 * Represents a single rubric filter option.
 */
export interface StihirusFilterRubric {
    /** Rubric ID used for filtering in API calls. */
    id: number;
    /** Display name of the rubric. */
    name: string;
    /** Number of poems in this rubric for the author. */
    count: number;
}

/**
 * Represents a single date filter option.
 */
export interface StihirusFilterDate {
    /** Year used for filtering. */
    year: number;
    /** Month used for filtering (1-12). */
    month: number;
    /** Number of poems published in this month/year by the author. */
    count: number;
}

/**
 * Structure containing available filter options for an author.
 */
export interface StihirusAuthorFiltersData {
    /** Array of available rubric filters. */
    rubrics: StihirusFilterRubric[];
    /** Array of available date filters. */
    dates: StihirusFilterDate[];
}

/**
 * Successful response structure for `getAuthorFilters`.
 */
export interface StihirusFiltersSuccessResponse {
    status: 'success';
    data: StihirusAuthorFiltersData;
}

/**
 * Possible response types from `getAuthorFilters`.
 */
export type StihirusFiltersResponse = StihirusFiltersSuccessResponse | StihirusErrorResponse;


/**
 * Asynchronously fetches author data from stihirus.ru.
 * Can be used in Node.js or browser environments (requires CORS proxy for browser).
 *
 * @param identifier - Author identifier (ID, username, subdomain URL, or path URL).
 * @param page - Optional. Controls poem fetching: `null` (default) = all poems, `0` = profile only, `N > 0` = specific page N.
 * @param requestDelayMs - Optional. Delay between API calls when fetching all pages (`page = null`). Defaults to 500ms.
 * @param proxyUrl - Optional. URL of the CORS proxy (e.g., 'https://your-proxy.com'). Required for browser usage.
 * @param proxyApiKey - Optional. API key for the CORS proxy, if required. Sent as 'X-Proxy-Api-Key' header.
 * @returns A promise resolving to `StihirusResponse`. Check `status` field.
 */
export declare function getAuthorData(
    identifier: string | number,
    page?: number | null,
    requestDelayMs?: number,
    proxyUrl?: string | null,
    proxyApiKey?: string | null
): Promise<StihirusResponse>;

/**
 * Asynchronously fetches available filter options (rubrics, dates) for an author's poems.
 * Can be used in Node.js or browser environments (requires CORS proxy for browser).
 *
 * @param identifier - Author identifier (ID, username, subdomain URL, or path URL).
 * @param proxyUrl - Optional. URL of the CORS proxy (e.g., 'https://your-proxy.com'). Required for browser usage.
 * @param proxyApiKey - Optional. API key for the CORS proxy, if required. Sent as 'X-Proxy-Api-Key' header.
 * @returns A promise resolving to `StihirusFiltersResponse`. Check `status` field.
 */
export declare function getAuthorFilters(
    identifier: string | number,
    proxyUrl?: string | null,
    proxyApiKey?: string | null
): Promise<StihirusFiltersResponse>;
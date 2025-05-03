export interface StihirusAuthorStats {
    poems: number;
    reviewsSent: number;
    reviewsReceived: number;
}

export interface StihirusCollectionInfo {
    name: string;
    url: string;
}

export interface StihirusPoemRubric {
    name: string;
    url: string | null;
}

export interface StihirusPoemContest {
    id: number;
    name: string;
}

export interface StihirusPoemHolidaySection {
    id: number;
    url: string | null;
    title: string;
}

export type StihirusUniquenessStatus = -1 | 0 | 1;

export interface StihirusPoem {
    id: number;
    title: string;
    text: string;
    created: string;
    rubric: StihirusPoemRubric;
    collection: string | null;
    rating: number;
    commentsCount: number;
    imageUrl: string | null;
    hasCertificate: boolean;
    gifts: string[];
    uniquenessStatus: StihirusUniquenessStatus;
    contest?: StihirusPoemContest | null;
    holidaySection?: StihirusPoemHolidaySection | null;
    author?: {
        id: number;
        username: string;
        profileUrl: string;
    } | null;
}

export interface StihirusAuthorData {
    authorId: number;
    username: string;
    profileUrl: string;
    canonicalUsername: string;
    description: string;
    avatarUrl: string | null;
    headerUrl: string | null;
    status: string;
    lastVisit: string;
    stats: StihirusAuthorStats;
    collections: StihirusCollectionInfo[];
    isPremium: boolean;
    poems: StihirusPoem[];
}

export interface StihirusError {
    code: number;
    message: string;
    originalMessage?: string;
}

export interface StihirusSuccessResponse {
    status: 'success';
    data: StihirusAuthorData;
}

export interface StihirusErrorResponse {
    status: 'error';
    error: StihirusError;
}

export type StihirusResponse = StihirusSuccessResponse | StihirusErrorResponse;

export interface StihirusFilterRubric {
    id: number;
    name: string;
    count: number;
}

export interface StihirusFilterDate {
    year: number;
    month: number;
    count: number;
}

export interface StihirusAuthorFiltersData {
    rubrics: StihirusFilterRubric[];
    dates: StihirusFilterDate[];
}

export interface StihirusFiltersSuccessResponse {
    status: 'success';
    data: StihirusAuthorFiltersData;
}

export type StihirusFiltersResponse = StihirusFiltersSuccessResponse | StihirusErrorResponse;

export interface StihirusHomepageAuthor {
    username: string;
    canonicalUsername: string;
    profileUrl: string;
    avatarUrl: string | null;
    poemsCount?: number | null;
    rating?: number | null;
}

export interface StihirusHomepagePoem {
    id: number;
    title: string;
    url: string;
    authorUsername: string;
    authorProfileUrl: string;
    rating?: number | null;
    commentsCount?: number | null;
}

export interface StihirusHomepageSuccessResponse<T> {
    status: 'success';
    data: T[];
}

export type StihirusHomepageResponse<T> = StihirusHomepageSuccessResponse<T> | StihirusErrorResponse;

export interface StihirusSinglePoemSuccessResponse {
    status: 'success';
    data: StihirusPoem;
}

export type StihirusSinglePoemResponse = StihirusSinglePoemSuccessResponse | StihirusErrorResponse;

export interface StihirusFilterOptions {
    rubricId?: number;
    year?: number;
    month?: number;
}

export declare function getAuthorData(
    identifier: string | number,
    page?: number | null,
    requestDelayMs?: number,
    filterOptions?: StihirusFilterOptions | null
): Promise<StihirusResponse>;

export declare function getAuthorFilters(
    identifier: string | number
): Promise<StihirusFiltersResponse>;

export declare function getRecommendedAuthors(): Promise<StihirusHomepageResponse<StihirusHomepageAuthor>>;

export declare function getPromoPoems(): Promise<StihirusHomepageResponse<StihirusHomepagePoem>>;

export declare function getWeeklyRatedAuthors(): Promise<StihirusHomepageResponse<StihirusHomepageAuthor>>;

export declare function getActiveAuthors(): Promise<StihirusHomepageResponse<StihirusHomepageAuthor>>;

export declare function getPoemById(
    poemId: number
): Promise<StihirusSinglePoemResponse>;
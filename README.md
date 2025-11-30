# StihiRus Reader / Парсер StihiRus

[English](#english) | [Русский](#русский)

---

## English

Node.js module (ESM) to fetch author profile information (description, stats, collections), available filters (rubrics, dates), poems (all, specific page, or filtered), specific poem data, and homepage data (recommended authors, promo poems, etc.) from the Russian poetry website stihirus.ru.

It handles various author identifiers (ID, username, URL) and retrieves data by parsing HTML pages and querying internal APIs. Functions return a structured response indicating success or failure.

**This library is intended for use in Node.js environments.**

### Installation

```bash
# From npm registry (recommended)
npm install @opexdevelop/stihirus-reader

# Or from GitHub Packages registry
# (Requires authentication or .npmrc configuration for the @opexdevelop scope)
# npm install @opexdevelop/stihirus-reader --registry=https://npm.pkg.github.com
```
Requires Node.js v16 or higher.

### Usage (Node.js)

```javascript
// example.js
import {
    getAuthorData,
    getAuthorFilters,
    getRecommendedAuthors,
    getPromoPoems,
    getWeeklyRatedAuthors,
    getActiveAuthors,
    getPoemById
} from '@opexdevelop/stihirus-reader';

async function runNodeExample(identifier, page = null, delay = 500) {
    console.log(`\n--- [Node.js] Fetching data for: ${identifier} | Page: ${page === null ? 'All' : page} ---`);
    try {
        // Fetch main author data (e.g., page 1)
        const response = await getAuthorData(identifier, page, delay);

        console.log("\n=== Author Data Response ===");
        if (response.status === 'success') {
            const d = response.data;
            console.log(`Status: ${response.status}`);
            console.log(`Author: ${d.username} (ID: ${d.authorId})`);
            console.log(`Premium: ${d.isPremium}`);
            console.log(`Profile URL: ${d.profileUrl}`);
            console.log(`Stats: ${JSON.stringify(d.stats)}`);
            console.log(`Collections (${d.collections.length}):`);
            console.log(d.collections.length > 0 ? JSON.stringify(d.collections.slice(0,2), null, 2) + (d.collections.length > 2 ? '\n...' : '') : '(No collections)');
            console.log(`Poems received: ${d.poems.length}`);
            if (d.poems.length > 0) {
                console.log(`--- First Poem Details ---`);
                console.log(JSON.stringify(d.poems[0], null, 2));
            }
        } else {
            console.error("Status: error");
            console.error("Error:", JSON.stringify(response.error, null, 2));
        }

        // Fetch available filters
        console.log(`\n--- [Node.js] Fetching filters for: ${identifier} ---`);
        const filtersResponse = await getAuthorFilters(identifier);

        console.log("\n=== Filters Response ===");
        if (filtersResponse.status === 'success') {
            const f = filtersResponse.data;
            console.log(`Status: ${filtersResponse.status}`);
            console.log(`Available Rubric Filters (${f.rubrics.length}):`);
            console.log(f.rubrics.length > 0 ? JSON.stringify(f.rubrics.slice(0,3), null, 2) + (f.rubrics.length > 3 ? '\n...' : '') : '(No rubric filters)');
            console.log(`\nAvailable Date Filters (${f.dates.length}):`);
            console.log(f.dates.length > 0 ? JSON.stringify(f.dates.slice(0,3), null, 2) + (f.dates.length > 3 ? '\n...' : '') : '(No date filters)');

            // Example: Fetch filtered poems using the first available rubric filter
            if (f.rubrics.length > 0) {
                const firstRubric = f.rubrics[0];
                console.log(`\n--- Fetching Filtered Poems (Rubric: ${firstRubric.name}) ---`);
                const filteredResponse = await getAuthorData(identifier, null, delay, { rubricId: firstRubric.id });
                 if (filteredResponse.status === 'success') {
                     console.log(`Status: success`);
                     console.log(`Found ${filteredResponse.data.poems.length} poems in rubric ${firstRubric.id}.`);
                     if (filteredResponse.data.poems.length > 0) {
                         console.log("First filtered poem:", JSON.stringify(filteredResponse.data.poems[0], null, 2));
                     }
                 } else {
                     console.error("Status: error");
                     console.error("Error fetching filtered poems:", JSON.stringify(filteredResponse.error, null, 2));
                 }
            }

        } else {
             console.error("Status: error");
             console.error("Error fetching filters:", JSON.stringify(filtersResponse.error, null, 2));
        }

        // Fetch Homepage Data
        console.log(`\n--- Fetching Homepage Data ---`);
        const [recAuthors, promoPoems, weeklyAuthors, activeAuthors] = await Promise.all([
            getRecommendedAuthors(),
            getPromoPoems(),
            getWeeklyRatedAuthors(),
            getActiveAuthors()
        ]);

        console.log("\n=== Recommended Authors ===");
        if(recAuthors.status === 'success') console.log(JSON.stringify(recAuthors.data.slice(0,3), null, 2) + (recAuthors.data.length > 3 ? '\n...' : '')); else console.error(recAuthors.error);
        console.log("\n=== Promo Poems ===");
        if(promoPoems.status === 'success') console.log(JSON.stringify(promoPoems.data.slice(0,3), null, 2) + (promoPoems.data.length > 3 ? '\n...' : '')); else console.error(promoPoems.error);
        console.log("\n=== Weekly Rated Authors ===");
        if(weeklyAuthors.status === 'success') console.log(JSON.stringify(weeklyAuthors.data.slice(0,3), null, 2) + (weeklyAuthors.data.length > 3 ? '\n...' : '')); else console.error(weeklyAuthors.error);
        console.log("\n=== Active Authors ===");
        if(activeAuthors.status === 'success') console.log(JSON.stringify(activeAuthors.data.slice(0,3), null, 2) + (activeAuthors.data.length > 3 ? '\n...' : '')); else console.error(activeAuthors.error);

        // Fetch Single Poem
        const poemIdToFetch = 317868; // Example ID
        console.log(`\n--- Fetching Single Poem (ID: ${poemIdToFetch}) ---`);
        const poemResp = await getPoemById(poemIdToFetch);
        console.log("\n=== Single Poem Response ===");
        if(poemResp.status === 'success') console.log(JSON.stringify(poemResp.data, null, 2)); else console.error(poemResp.error);


    } catch (error) {
        console.error(`\n!!! UNEXPECTED SCRIPT ERROR for ${identifier}:`, error);
    } finally {
        console.log(`\n--- Fetching finished for: ${identifier} ---`);
    }
}

async function main() {
    const AUTHOR_IDENTIFIER = 'oreh-orehov'; // Or 14260, or URL like 'https://...'
    const PAGE_TO_FETCH = 1; // null = all pages, 0 = profile only, N > 0 = page N
    const REQUEST_DELAY_MS = 200; // Delay between requests when fetching all pages

    await runNodeExample(AUTHOR_IDENTIFIER, PAGE_TO_FETCH, REQUEST_DELAY_MS);
}

main();
```

### API

#### `getAuthorData(identifier, [page], [requestDelayMs], [filterOptions])`

Asynchronously fetches author profile and poem data.

*   **`identifier`**: `string | number` - Author ID, username, subdomain URL, or path URL.
*   **`page`**: `number | null` (Optional) - Controls poem fetching: `null` (all), `0` (profile only), `N > 0` (page N). Default: `null`.
*   **`requestDelayMs`**: `number` (Optional) - Delay between API requests when fetching *all* pages (`page = null`) sequentially (used only when filters are active, otherwise parallel fetching is used). Default: `200`.
*   **`filterOptions`**: `StihirusFilterOptions | null` (Optional) - Object to filter poems: `{ rubricId?: number, year?: number, month?: number }`. Get available IDs/dates from `getAuthorFilters`. Default: `null`.
*   **Returns**: `Promise<StihirusResponse>` - Check `status` field (`'success'` or `'error'`).

#### `getAuthorFilters(identifier)`

Asynchronously fetches available filter options (rubrics and dates) for an author's poems.

*   **`identifier`**: `string | number` - Author ID, username, subdomain URL, or path URL.
*   **Returns**: `Promise<StihirusFiltersResponse>` - Check `status` field (`'success'` or `'error'`).

#### `getPoemById(poemId)`

Asynchronously fetches data for a single poem by its ID using the API.

*   **`poemId`**: `number` - The unique ID of the poem.
*   **Returns**: `Promise<StihirusSinglePoemResponse>` - Check `status` field (`'success'` or `'error'`).

#### Homepage Functions

These functions fetch data by parsing the `stihirus.ru` homepage.

*   **`getRecommendedAuthors()`**: Gets recommended authors.
*   **`getPromoPoems()`**: Gets promo poems.
*   **`getWeeklyRatedAuthors()`**: Gets weekly rated authors.
*   **`getActiveAuthors()`**: Gets active authors.
*   **Returns**: `Promise<StihirusHomepageResponse<DataStructure>>` - Where `DataStructure` is `StihirusHomepageAuthor` or `StihirusHomepagePoem`. Check `status` field.

**Returned Object Structures:**

```typescript
// See index.d.ts for detailed interface definitions.

// Example StihirusPoem structure:
interface StihirusPoem {
  id: number;
  title: string;
  text: string;
  created: string; // "DD.MM.YYYY HH:MM"
  rubric: { name: string; url: string | null };
  collection: string | null;
  rating: number;
  commentsCount: number;
  imageUrl: string | null;
  hasCertificate: boolean;
  gifts: string[]; // e.g. [] or ["proizv_podarok1"]
  uniquenessStatus: -1 | 0 | 1; // -1: checking, 0: not unique, 1: unique/certified
  contest?: { id: number; name: string } | null;
  holidaySection?: { id: number; url: string | null; title: string } | null;
  author?: {
      id: number;
      username: string;
      uri?: string;
      profileUrl: string;
      avatarUrl?: string | null;
  } | null;
}

// Example StihirusAuthorData structure:
interface StihirusAuthorData {
  authorId: number;
  username: string;
  profileUrl: string;
  canonicalUsername: string;
  description: string;
  avatarUrl: string | null;
  headerUrl: string | null;
  status: string;
  lastVisit: string;
  stats: { poems: number; reviewsSent: number; reviewsReceived: number; subscribers: number };
  collections: { name: string; url: string }[];
  isPremium: boolean;
  poems: StihirusPoem[];
}
```

### Important Notes

*   **Unofficial:** Uses web scraping and internal APIs. Site changes may break it.
*   **Rate Limiting:** Default 200ms delay is used when fetching multiple pages sequentially (with filters). Parallel fetching is used for unrestricted downloads. Use responsibly.
*   **Error Handling:** Returns `{ status: 'error', error: {...} }` for operational errors, does not throw them. Always check `status`.
*   **Environment:** This library is designed for Node.js.

### License

MIT

---

## Русский

Node.js модуль (ESM) для получения информации профиля автора (описание, статистика, сборники), доступных фильтров (рубрики, даты), стихов (всех, конкретной страницы или отфильтрованных), данных конкретного стихотворения и данных с главной страницы (рекомендуемые авторы, промо-стихи и т.д.) с сайта русской поэзии stihirus.ru.

Обрабатывает различные идентификаторы автора (ID, имя пользователя, URL) и извлекает данные путем парсинга HTML-страниц и запросов к внутренним API. Функции возвращают структурированный ответ, указывающий на успех или неудачу.

**Эта библиотека предназначена для использования в среде Node.js.**

### Установка

```bash
# Из реестра npm (рекомендуется)
npm install @opexdevelop/stihirus-reader

# Или из реестра GitHub Packages
# (Требует аутентификации или настройки .npmrc для области @opexdevelop)
# npm install @opexdevelop/stihirus-reader --registry=https://npm.pkg.github.com
```
Требуется Node.js v16 или выше.

### Использование (Node.js)

```javascript
// example.js
import {
    getAuthorData,
    getAuthorFilters,
    getRecommendedAuthors,
    getPromoPoems,
    getWeeklyRatedAuthors,
    getActiveAuthors,
    getPoemById
} from '@opexdevelop/stihirus-reader';

async function runNodeExample(identifier, page = null, delay = 500) {
    console.log(`\n--- [Node.js] Получение данных для: ${identifier} | Страница: ${page === null ? 'Все' : page} ---`);
    try {
        // Получаем основные данные автора (например, стр. 1)
        const response = await getAuthorData(identifier, page, delay);

        console.log("\n=== Ответ с данными автора ===");
        if (response.status === 'success') {
            const d = response.data;
            console.log(`Статус: ${response.status}`);
            console.log(`Автор: ${d.username} (ID: ${d.authorId})`);
            console.log(`Премиум: ${d.isPremium}`);
            console.log(`URL профиля: ${d.profileUrl}`);
            console.log(`Статистика: ${JSON.stringify(d.stats)}`);
            console.log(`Сборники (${d.collections.length}):`);
            console.log(d.collections.length > 0 ? JSON.stringify(d.collections.slice(0,2), null, 2) + (d.collections.length > 2 ? '\n...' : '') : '(Нет сборников)');
            console.log(`Получено стихов: ${d.poems.length}`);
            if (d.poems.length > 0) {
                console.log(`--- Детали первого стихотворения ---`);
                console.log(JSON.stringify(d.poems[0], null, 2));
            }
        } else {
            console.error("Статус: error");
            console.error("Ошибка:", JSON.stringify(response.error, null, 2));
        }

        // Получаем доступные фильтры
        console.log(`\n--- [Node.js] Получение фильтров для: ${identifier} ---`);
        const filtersResponse = await getAuthorFilters(identifier);

        console.log("\n=== Ответ с фильтрами ===");
        if (filtersResponse.status === 'success') {
            const f = filtersResponse.data;
            console.log(`Статус: ${filtersResponse.status}`);
            console.log(`Доступные фильтры по рубрикам (${f.rubrics.length}):`);
            console.log(f.rubrics.length > 0 ? JSON.stringify(f.rubrics.slice(0,3), null, 2) + (f.rubrics.length > 3 ? '\n...' : '') : '(Нет фильтров по рубрикам)');
            console.log(`\nДоступные фильтры по датам (${f.dates.length}):`);
            console.log(f.dates.length > 0 ? JSON.stringify(f.dates.slice(0,3), null, 2) + (f.dates.length > 3 ? '\n...' : '') : '(Нет фильтров по датам)');

            // Пример: Получение отфильтрованных стихов по первому доступному фильтру рубрики
            if (f.rubrics.length > 0) {
                const firstRubric = f.rubrics[0];
                console.log(`\n--- Получение отфильтрованных стихов (Рубрика: ${firstRubric.name}) ---`);
                const filteredResponse = await getAuthorData(identifier, null, delay, { rubricId: firstRubric.id });
                 if (filteredResponse.status === 'success') {
                     console.log(`Статус: success`);
                     console.log(`Найдено ${filteredResponse.data.poems.length} стихов в рубрике ${firstRubric.id}.`);
                     if (filteredResponse.data.poems.length > 0) {
                         console.log("Первое отфильтрованное стихотворение:", JSON.stringify(filteredResponse.data.poems[0], null, 2));
                     }
                 } else {
                     console.error("Статус: error");
                     console.error("Ошибка получения отфильтрованных стихов:", JSON.stringify(filteredResponse.error, null, 2));
                 }
            }

        } else {
             console.error("Статус: error");
             console.error("Ошибка получения фильтров:", JSON.stringify(filtersResponse.error, null, 2));
        }

        // Получение данных с главной страницы
        console.log(`\n--- Получение данных с главной страницы ---`);
        const [recAuthors, promoPoems, weeklyAuthors, activeAuthors] = await Promise.all([
            getRecommendedAuthors(),
            getPromoPoems(),
            getWeeklyRatedAuthors(),
            getActiveAuthors()
        ]);

        console.log("\n=== Рекомендуемые авторы ===");
        if(recAuthors.status === 'success') console.log(JSON.stringify(recAuthors.data.slice(0,3), null, 2) + (recAuthors.data.length > 3 ? '\n...' : '')); else console.error(recAuthors.error);
        console.log("\n=== Промо стихи ===");
        if(promoPoems.status === 'success') console.log(JSON.stringify(promoPoems.data.slice(0,3), null, 2) + (promoPoems.data.length > 3 ? '\n...' : '')); else console.error(promoPoems.error);
        console.log("\n=== Рейтинг недели ===");
        if(weeklyAuthors.status === 'success') console.log(JSON.stringify(weeklyAuthors.data.slice(0,3), null, 2) + (weeklyAuthors.data.length > 3 ? '\n...' : '')); else console.error(weeklyAuthors.error);
        console.log("\n=== Активные авторы ===");
        if(activeAuthors.status === 'success') console.log(JSON.stringify(activeAuthors.data.slice(0,3), null, 2) + (activeAuthors.data.length > 3 ? '\n...' : '')); else console.error(activeAuthors.error);

        // Получение одного стихотворения
        const poemIdToFetch = 317868; // Пример ID
        console.log(`\n--- Получение стихотворения (ID: ${poemIdToFetch}) ---`);
        const poemResp = await getPoemById(poemIdToFetch);
        console.log("\n=== Ответ по стихотворению ===");
        if(poemResp.status === 'success') console.log(JSON.stringify(poemResp.data, null, 2)); else console.error(poemResp.error);


    } catch (error) {
        console.error(`\n!!! НЕПРЕДВИДЕННАЯ ОШИБКА СКРИПТА для ${identifier}:`, error);
    } finally {
        console.log(`\n--- Получение данных завершено для: ${identifier} ---`);
    }
}

async function main() {
    const AUTHOR_IDENTIFIER = 'oreh-orehov'; // Или 14260, или URL
    const PAGE_TO_FETCH = 1; // null = все страницы, 0 = только профиль, N > 0 = страница N
    const REQUEST_DELAY_MS = 200; // Задержка между запросами при получении всех страниц

    await runNodeExample(AUTHOR_IDENTIFIER, PAGE_TO_FETCH, REQUEST_DELAY_MS);
}

main();
```

### API

#### `getAuthorData(identifier, [page], [requestDelayMs], [filterOptions])`

Асинхронно получает данные профиля и стихи автора.

*   **`identifier`**: `string | number` - ID автора, имя пользователя, URL поддомена или URL пути.
*   **`page`**: `number | null` (Опционально) - Управляет загрузкой стихов: `null` (все), `0` (только профиль), `N > 0` (страница N). По умолчанию: `null`.
*   **`requestDelayMs`**: `number` (Опционально) - Задержка между запросами API при загрузке *всех* страниц (`page = null`) последовательно (используется только при активных фильтрах, иначе используется параллельная загрузка). По умолчанию: `200`.
*   **`filterOptions`**: `StihirusFilterOptions | null` (Опционально) - Объект для фильтрации стихов: `{ rubricId?: number, year?: number, month?: number }`. Доступные ID/даты можно получить через `getAuthorFilters`. По умолчанию: `null`.
*   **Возвращает**: `Promise<StihirusResponse>` - Проверьте поле `status` (`'success'` или `'error'`).

#### `getAuthorFilters(identifier)`

Асинхронно получает доступные опции фильтрации (рубрики и даты) для стихов автора.

*   **`identifier`**: `string | number` - ID автора, имя пользователя, URL поддомена или URL пути.
*   **Возвращает**: `Promise<StihirusFiltersResponse>` - Проверьте поле `status` (`'success'` или `'error'`).

#### `getPoemById(poemId)`

Асинхронно получает данные одного стихотворения по его ID используя API.

*   **`poemId`**: `number` - Уникальный ID стихотворения.
*   **Возвращает**: `Promise<StihirusSinglePoemResponse>` - Проверьте поле `status` (`'success'` или `'error'`).

#### Функции для главной страницы

Эти функции получают данные путем парсинга главной страницы `stihirus.ru`.

*   **`getRecommendedAuthors()`**: Получает рекомендуемых авторов.
*   **`getPromoPoems()`**: Получает промо-стихи.
*   **`getWeeklyRatedAuthors()`**: Получает авторов из рейтинга недели.
*   **`getActiveAuthors()`**: Получает активных авторов.
*   **Возвращает**: `Promise<StihirusHomepageResponse<DataStructure>>` - Где `DataStructure` это `StihirusHomepageAuthor` или `StihirusHomepagePoem`. Проверьте поле `status`.

**Структуры возвращаемых объектов:**

```typescript
// Смотрите index.d.ts для детальных определений интерфейсов.

// Пример структуры StihirusPoem:
interface StihirusPoem {
  id: number;
  title: string;
  text: string;
  created: string; // "DD.MM.YYYY HH:MM"
  rubric: { name: string; url: string | null };
  collection: string | null;
  rating: number;
  commentsCount: number;
  imageUrl: string | null;
  hasCertificate: boolean;
  gifts: string[]; // напр. [] или ["proizv_podarok1"]
  uniquenessStatus: -1 | 0 | 1; // -1: проверка, 0: неуникально, 1: уникально/сертификат
  contest?: { id: number; name: string } | null;
  holidaySection?: { id: number; url: string | null; title: string } | null;
  author?: {
      id: number;
      username: string;
      uri?: string;
      profileUrl: string;
      avatarUrl?: string | null;
  } | null;
}

// Пример структуры StihirusAuthorData:
interface StihirusAuthorData {
  authorId: number;
  username: string;
  profileUrl: string;
  canonicalUsername: string;
  description: string;
  avatarUrl: string | null;
  headerUrl: string | null;
  status: string;
  lastVisit: string;
  stats: { poems: number; reviewsSent: number; reviewsReceived: number; subscribers: number };
  collections: { name: string; url: string }[];
  isPremium: boolean;
  poems: StihirusPoem[];
}
```

### Важные замечания

*   **Неофициальный:** Использует веб-скрапинг и внутренние API. Изменения на сайте могут сломать модуль.
*   **Ограничение запросов:** Задержка 200мс по умолчанию используется при последовательной загрузке всех страниц (с фильтрами). Параллельная загрузка используется для скачивания без ограничений. Используйте ответственно.
*   **Обработка ошибок:** Возвращает `{ status: 'error', error: {...} }` при операционных ошибках, не выбрасывает их. Всегда проверяйте `status`.
*   **Среда выполнения:** Библиотека предназначена для Node.js.

### Лицензия

MIT
# StihiRus Reader / Парсер StihiRus

[English](#english) | [Русский](#русский)

---

## English

Node.js module (ESM) to fetch author profile information (description, stats, collections), available filters (rubrics, dates), and optionally poems (all, specific page, or none) from the Russian poetry website stihirus.ru.

It handles various author identifiers (ID, username, URL) and retrieves data by parsing the author's page and querying internal APIs. Functions return a structured response indicating success or failure.

**Can be used in Node.js or in the Browser (requires a CORS proxy).**

### Installation

```bash
npm install stihirus-reader
```
Requires Node.js v16 or higher for Node.js usage.

### Usage (Node.js)

This is the primary intended use case.

```javascript
// node_example.js
import { getAuthorData, getAuthorFilters } from 'stihirus-reader';

async function runNodeExample(identifier, page = null, delay = 500) {
    console.log(`\n--- [Node.js] Fetching data for: ${identifier} | Page: ${page === null ? 'All' : page} ---`);
    try {
        // Fetch main author data
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
    const AUTHOR_IDENTIFIER = 'oreh-orehov'; // Or 14260, or URL like 'https://...'
    const PAGE_TO_FETCH = 1; // null = all pages, 0 = profile only, N > 0 = page N
    const REQUEST_DELAY_MS = 500; // Delay between requests when fetching all pages

    await runNodeExample(AUTHOR_IDENTIFIER, PAGE_TO_FETCH, REQUEST_DELAY_MS);
}

main();
```

### Usage (Browser)

Using this library directly in a browser requires a **CORS proxy** because direct requests from browser scripts to `stihirus.ru` are blocked by security policies.

A pre-bundled version (including dependencies like `cheerio`) is available via the jsDelivr CDN. This version exposes the library functions on the global `window.StihirusReader` object.

1.  **Setup a Proxy:** You need a proxy server that will make the requests to `stihirus.ru` on behalf of the browser. An example that can be easily deployed (e.g., on Hugging Face Spaces) is available here: [huggingface.co/spaces/opex792/corsfix](https://huggingface.co/spaces/opex792/corsfix). Clone it and set your own `API_KEY` environment variable for security.
2.  **Include the script:** Add the following `<script>` tag to your HTML file. This URL points to a specific version of the pre-bundled file hosted on jsDelivr, which pulls it from the `dist` folder of the `opexdevelop/stihirus-reader` GitHub repository.

    ```html
    <script src="https://cdn.jsdelivr.net/gh/opexdevelop/stihirus-reader@1.2.0/dist/stihirus-reader.browser.min.js"></script>
    ```
    *(Note: Replace `1.2.0` with the actual version tag you want to use.)*

3.  **Use the functions:** The library functions will be available on the global `window.StihirusReader` object. Remember to configure and pass your CORS proxy details (`proxyUrl` and `proxyApiKey`) to the functions when calling them.

    ```html
    <!DOCTYPE html>
    <html>
    <head>
        <title>StihiRus Reader - Bundled CDN Example</title>
        <meta charset="UTF-8">
        <style> /* Basic styles */ body{font-family:sans-serif;margin:20px} #output{border:1px solid #ccc;padding:10px;margin-top:10px;max-height:80vh;overflow-y:auto;background:#f9f9f9} pre{background:#eee;padding:8px;border-radius:4px;white-space:pre-wrap;word-break:break-word;margin-bottom:10px;font-size:.9em} h2{margin-top:0} </style>
    </head>
    <body>
        <h1>StihiRus Reader Browser Test (CDN Bundle)</h1>
        <p>Check the browser console (F12) and the output below. Ensure PROXY settings are correct.</p>
        <div id="output">Loading...</div>

        <!-- 1. Include from CDN (replace version if needed) -->
        <script src="https://cdn.jsdelivr.net/gh/opexdevelop/stihirus-reader@1.2.0/dist/stihirus-reader.browser.min.js"></script>

        <!-- 2. Your script using the library -->
        <script>
            // --- CONFIGURATION ---
            const AUTHOR_IDENTIFIER = 'oreh-orehov';
            // IMPORTANT: Replace with YOUR deployed proxy URL
            const PROXY_URL = 'https://your-cors-proxy-instance.hf.space'; // Required!
            // IMPORTANT: Replace with YOUR proxy's API key (or null)
            const PROXY_API_KEY = 'your_secret_api_key';
            // --- END CONFIGURATION ---

            async function runExample() {
                const outputDiv = document.getElementById('output');
                outputDiv.innerHTML = '<h2>Fetching data...</h2>';
                const logToPage = (msg, isErr=false) => {
                    console[isErr?'error':'log'](msg); const p=document.createElement('pre'); p.style.whiteSpace='pre-wrap'; p.style.wordBreak='break-word'; p.textContent=typeof msg==='object'?JSON.stringify(msg,null,2):String(msg); if(isErr)p.style.color='red'; outputDiv.appendChild(p);
                };

                if (!window.StihirusReader) {
                    logToPage("ERROR: StihirusReader not found. Check CDN script URL and version.", true); return;
                }

                logToPage(`Fetching data for: ${AUTHOR_IDENTIFIER} | Page: 1`);
                try {
                    const response = await window.StihirusReader.getAuthorData(
                        AUTHOR_IDENTIFIER, 1, 500, PROXY_URL, PROXY_API_KEY
                    );
                    logToPage("--- Author Data Response ---");
                    if (response.status === 'success') {
                        const d = response.data;
                        logToPage(`Author: ${d.username} (ID: ${d.authorId})`);
                        logToPage(`Profile URL: ${d.profileUrl}`);
                        logToPage(`Stats: ${JSON.stringify(d.stats)}`);
                        logToPage(`Poems received: ${d.poems.length}`);
                        if (d.poems.length > 0) {
                             logToPage(`--- First Poem Details ---`);
                             logToPage(d.poems[0]); // Log first poem object
                             if (d.poems.length > 1) {
                                logToPage(`(${d.poems.length - 1} more poems received but not fully displayed here)`);
                             }
                        }
                    } else {
                        logToPage(`ERROR fetching data: ${response.error.message}`, true); logToPage(response.error);
                    }

                    logToPage(`\n--- Fetching Filters ---`);
                    const filtersResponse = await window.StihirusReader.getAuthorFilters(
                        AUTHOR_IDENTIFIER, PROXY_URL, PROXY_API_KEY
                    );
                    logToPage("--- Filters Response ---");
                     if (filtersResponse.status === 'success') {
                        logToPage(filtersResponse.data);
                    } else {
                        logToPage(`ERROR fetching filters: ${filtersResponse.error.message}`, true); logToPage(filtersResponse.error);
                    }

                } catch (error) {
                    logToPage(`UNEXPECTED SCRIPT ERROR: ${error}`, true); logToPage(error);
                } finally {
                     const h2 = outputDiv.querySelector('h2'); if(h2) h2.textContent = 'Fetching complete.';
                }
            }
            runExample();
        </script>
    </body>
    </html>
    ```

### API

#### `getAuthorData(identifier, [page], [requestDelayMs], [proxyUrl], [proxyApiKey])`

Asynchronously fetches author profile and poem data.

*   **`identifier`**: `string | number` - Author ID, username, subdomain URL, or path URL.
*   **`page`**: `number | null` (Optional) - Controls poem fetching: `null` (all), `0` (profile only), `N > 0` (page N). Default: `null`.
*   **`requestDelayMs`**: `number` (Optional) - Delay between API requests when fetching *all* pages (`page = null`). Default: `500`.
*   **`proxyUrl`**: `string | null` (Optional) - URL of your CORS proxy. **Required for browser usage.** Default: `null`.
*   **`proxyApiKey`**: `string | null` (Optional) - API key for your CORS proxy, if needed. Sent as `X-Proxy-Api-Key` header. Default: `null`.
*   **Returns**: `Promise<StihirusResponse>` - Check `status` field (`'success'` or `'error'`).

#### `getAuthorFilters(identifier, [proxyUrl], [proxyApiKey])`

Asynchronously fetches available filter options (rubrics and dates).

*   **`identifier`**: `string | number` - Author ID, username, subdomain URL, or path URL.
*   **`proxyUrl`**: `string | null` (Optional) - URL of your CORS proxy. **Required for browser usage.** Default: `null`.
*   **`proxyApiKey`**: `string | null` (Optional) - API key for your CORS proxy, if needed. Default: `null`.
*   **Returns**: `Promise<StihirusFiltersResponse>` - Check `status` field (`'success'` or `'error'`).

**Returned Object Structures:**

```typescript
// --- getAuthorData Response ---
// Success: { status: 'success', data: StihirusAuthorData }
// Error:   { status: 'error', error: StihirusError }

// --- getAuthorFilters Response ---
// Success: { status: 'success', data: StihirusAuthorFiltersData }
// Error:   { status: 'error', error: StihirusError }

// --- Detailed Structures ---
interface StihirusAuthorData {
  authorId: number;
  username: string;         // Display name
  profileUrl: string;
  canonicalUsername: string;// URL-safe username
  description: string;
  avatarUrl: string | null;
  headerUrl: string | null;
  status: string;
  lastVisit: string;
  stats: StihirusAuthorStats;
  collections: StihirusCollectionInfo[];
  poems: StihirusPoem[];
}

interface StihirusPoem {
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
}

interface StihirusAuthorFiltersData {
  rubrics: StihirusFilterRubric[];
  dates: StihirusFilterDate[];
}

interface StihirusFilterRubric {
  id: number;    // ID for filtering
  name: string;
  count: number;
}

interface StihirusFilterDate {
  year: number;
  month: number; // 1-12
  count: number;
}

interface StihirusError {
  code: number;
  message: string;
  originalMessage?: string;
}

// Other interfaces (StihirusAuthorStats, StihirusCollectionInfo, StihirusPoemRubric) are defined in index.d.ts
```

### Important Notes

*   **Unofficial:** Uses web scraping and internal APIs. Site changes may break it.
*   **Rate Limiting:** Default 500ms delay between requests when fetching *all* poems (`page = null` in `getAuthorData`). Use responsibly.
*   **Error Handling:** Returns `{ status: 'error', error: {...} }` for operational errors, does not throw them. Always check `status`.
*   **Browser Usage:** Requires a CORS proxy. Pass the proxy URL and API key (if needed) to the functions. A pre-bundled version is available via CDN.

### License

MIT

---

## Русский

Node.js модуль (ESM) для получения информации профиля автора (описание, статистика, сборники), доступных фильтров (рубрики, даты) и, опционально, стихов (всех, конкретной страницы или ни одного) с сайта русской поэзии stihirus.ru.

Обрабатывает различные идентификаторы автора (ID, имя пользователя, URL) и извлекает данные путем парсинга страницы автора и запросов к внутренним API. Функции возвращают структурированный ответ, указывающий на успех или неудачу.

**Может использоваться в Node.js или в браузере (требует CORS-прокси).**

### Установка

```bash
npm install stihirus-reader
```
Требуется Node.js v16 или выше для использования в Node.js.

### Использование (Node.js)

Это основной предполагаемый способ использования.

```javascript
// node_example.js
import { getAuthorData, getAuthorFilters } from 'stihirus-reader';

async function runNodeExample(identifier, page = null, delay = 500) {
    console.log(`\n--- [Node.js] Получение данных для: ${identifier} | Страница: ${page === null ? 'Все' : page} ---`);
    try {
        // Получаем основные данные автора
        const response = await getAuthorData(identifier, page, delay);

        console.log("\n=== Ответ с данными автора ===");
        if (response.status === 'success') {
            const d = response.data;
            console.log(`Статус: ${response.status}`);
            console.log(`Автор: ${d.username} (ID: ${d.authorId})`);
            console.log(`Каноническое имя: ${d.canonicalUsername}`);
            console.log(`URL профиля: ${d.profileUrl}`);
            console.log(`Статус: ${d.status}`);
            console.log(`Последний визит: ${d.lastVisit}`);
            console.log(`URL аватара: ${d.avatarUrl || 'N/A'}`);
            console.log(`URL шапки: ${d.headerUrl || 'N/A'}`);
            console.log(`Описание:\n${d.description || '(Нет описания)'}`);
            console.log(`Статистика: ${JSON.stringify(d.stats)}`);
            console.log(`Сборники (${d.collections.length}):`);
            console.log(d.collections.length > 0 ? JSON.stringify(d.collections, null, 2) : '(Нет сборников)');
            console.log(`Получено стихов: ${d.poems.length}`);
            if (d.poems.length > 0) {
                console.log(`--- Детали первого стихотворения ---`);
                console.log(JSON.stringify(d.poems[0], null, 2));
                if (d.poems.length > 1) {
                    console.log(`(еще ${d.poems.length - 1} стих(ов) получено, но не показаны полностью)`);
                }
            } else {
                 console.log(`(Стихи для страницы ${page} не найдены)`);
            }
        } else {
            console.error(`Статус: ${response.status}`);
            console.error(`ОШИБКА получения данных: ${response.error.message} (Код: ${response.error.code})`);
            if (response.error.originalMessage) console.error(`Исходная ошибка: ${response.error.originalMessage}`);
            console.error("Полный объект ошибки:", JSON.stringify(response.error, null, 2));
        }

        // Получаем доступные фильтры
        console.log(`\n--- [Node.js] Получение фильтров для: ${identifier} ---`);
        const filtersResponse = await getAuthorFilters(identifier);

        console.log("\n=== Ответ с фильтрами ===");
        if (filtersResponse.status === 'success') {
            const f = filtersResponse.data;
            console.log(`Статус: ${filtersResponse.status}`);
            console.log(`Доступные фильтры по рубрикам (${f.rubrics.length}):`);
            console.log(f.rubrics.length > 0 ? JSON.stringify(f.rubrics, null, 2) : '(Нет фильтров по рубрикам)');
            console.log(`\nДоступные фильтры по датам (${f.dates.length}):`);
            console.log(f.dates.length > 0 ? JSON.stringify(f.dates, null, 2) : '(Нет фильтров по датам)');
        } else {
             console.error(`Статус: ${filtersResponse.status}`);
             console.error(`ОШИБКА получения фильтров: ${filtersResponse.error.message} (Код: ${filtersResponse.error.code})`);
            if (filtersResponse.error.originalMessage) console.error(`Исходная ошибка: ${filtersResponse.error.originalMessage}`);
            console.error("Полный объект ошибки:", JSON.stringify(filtersResponse.error, null, 2));
        }

    } catch (error) {
        console.error(`\n!!! НЕПРЕДВИДЕННАЯ ОШИБКА СКРИПТА для ${identifier}:`, error);
    } finally {
        console.log(`\n--- Получение данных завершено для: ${identifier} ---`);
    }
}

async function main() {
    const AUTHOR_IDENTIFIER = 'oreh-orehov'; // Или 14260, или URL
    const PAGE_TO_FETCH = 1; // null = все страницы, 0 = только профиль, N > 0 = страница N
    const REQUEST_DELAY_MS = 500; // Задержка между запросами при получении всех страниц

    await runNodeExample(AUTHOR_IDENTIFIER, PAGE_TO_FETCH, REQUEST_DELAY_MS);
}

main();
```

### Использование (Браузер)

Использование этой библиотеки напрямую в браузере требует **CORS-прокси**, так как прямые запросы из браузерных скриптов к `stihirus.ru` блокируются политиками безопасности.

Готовая собранная версия (включающая зависимости, такие как `cheerio`) доступна через CDN jsDelivr. Эта версия делает функции библиотеки доступными через глобальный объект `window.StihirusReader`.

1.  **Настройте прокси:** Вам нужен прокси-сервер, который будет выполнять запросы к `stihirus.ru` от имени браузера. Пример, который легко развернуть (например, на Hugging Face Spaces), доступен здесь: [huggingface.co/spaces/opex792/corsfix](https://huggingface.co/spaces/opex792/corsfix). Склонируйте его и установите свою переменную окружения `API_KEY` для безопасности.
2.  **Подключите скрипт:** Добавьте следующий тег `<script>` в ваш HTML-файл. Этот URL указывает на конкретную версию предварительно собранного файла, размещенного на jsDelivr, который загружает его из папки `dist` репозитория `opexdevelop/stihirus-reader` на GitHub.

    ```html
    <script src="https://cdn.jsdelivr.net/gh/opexdevelop/stihirus-reader@1.2.0/dist/stihirus-reader.browser.min.js"></script>
    ```
    *(Примечание: Замените `1.2.0` на актуальную версию, которую вы хотите использовать.)*

3.  **Используйте функции:** Функции библиотеки будут доступны через глобальный объект `window.StihirusReader`. Не забудьте настроить и передать данные вашего CORS-прокси (`proxyUrl` и `proxyApiKey`) при вызове функций.

    ```html
    <!DOCTYPE html>
    <html>
    <head>
        <title>StihiRus Reader - Bundled CDN Example</title>
        <meta charset="UTF-8">
        <style> /* Базовые стили */ body{font-family:sans-serif;margin:20px} #output{border:1px solid #ccc;padding:10px;margin-top:10px;max-height:80vh;overflow-y:auto;background:#f9f9f9} pre{background:#eee;padding:8px;border-radius:4px;white-space:pre-wrap;word-break:break-word;margin-bottom:10px;font-size:.9em} h2{margin-top:0} </style>
    </head>
    <body>
        <h1>StihiRus Reader Browser Test (CDN Bundle)</h1>
        <p>Проверьте консоль браузера (F12) и вывод ниже. Убедитесь, что настройки PROXY верны.</p>
        <div id="output">Загрузка...</div>

        <!-- 1. Подключаем с CDN (замените версию при необходимости) -->
        <script src="https://cdn.jsdelivr.net/gh/opexdevelop/stihirus-reader@1.2.0/dist/stihirus-reader.browser.min.js"></script>

        <!-- 2. Ваш скрипт, использующий библиотеку -->
        <script>
            // --- КОНФИГУРАЦИЯ ---
            const AUTHOR_IDENTIFIER = 'oreh-orehov'; // Или ID
            // ВАЖНО: Замените на URL вашего развернутого прокси
            const PROXY_URL = 'https://your-cors-proxy-instance.hf.space'; // Обязательно!
            // ВАЖНО: Замените на API-ключ вашего прокси (или null)
            const PROXY_API_KEY = 'your_secret_api_key';
            // --- КОНЕЦ КОНФИГУРАЦИИ ---

            async function runExample() {
                const outputDiv = document.getElementById('output');
                outputDiv.innerHTML = '<h2>Получение данных...</h2>';
                const logToPage = (msg, isErr=false) => {
                    console[isErr?'error':'log'](msg); const p=document.createElement('pre'); p.style.whiteSpace='pre-wrap'; p.style.wordBreak='break-word'; p.textContent=typeof msg==='object'?JSON.stringify(msg,null,2):String(msg); if(isErr)p.style.color='red'; outputDiv.appendChild(p);
                };

                if (!window.StihirusReader) {
                    logToPage("ОШИБКА: Функции StihirusReader не найдены. Проверьте URL скрипта CDN и версию.", true); return;
                }

                logToPage(`Получение данных для: ${AUTHOR_IDENTIFIER} | Страница: 1`);
                try {
                    const response = await window.StihirusReader.getAuthorData(
                        AUTHOR_IDENTIFIER, 1, 500, PROXY_URL, PROXY_API_KEY
                    );
                    logToPage("--- Ответ с данными автора ---");
                    if (response.status === 'success') {
                        const d = response.data;
                        logToPage(`Автор: ${d.username} (ID: ${d.authorId})`);
                        logToPage(`URL профиля: ${d.profileUrl}`);
                        logToPage(`Статистика: ${JSON.stringify(d.stats)}`);
                        logToPage(`Получено стихов: ${d.poems.length}`);
                         if (d.poems.length > 0) {
                             logToPage(`--- Детали первого стихотворения ---`);
                             logToPage(d.poems[0]); // Выводим объект первого стиха
                             if (d.poems.length > 1) {
                                logToPage(`(еще ${d.poems.length - 1} стих(ов) получено, но не показаны полностью)`);
                             }
                        }
                    } else {
                        logToPage(`ОШИБКА получения данных: ${response.error.message}`, true); logToPage(response.error);
                    }

                    logToPage(`\n--- Получение фильтров ---`);
                    const filtersResponse = await window.StihirusReader.getAuthorFilters(
                        AUTHOR_IDENTIFIER, PROXY_URL, PROXY_API_KEY
                    );
                    logToPage("--- Ответ с фильтрами ---");
                     if (filtersResponse.status === 'success') {
                        logToPage(filtersResponse.data);
                    } else {
                        logToPage(`ОШИБКА получения фильтров: ${filtersResponse.error.message}`, true); logToPage(filtersResponse.error);
                    }

                } catch (error) {
                    logToPage(`НЕПРЕДВИДЕННАЯ ОШИБКА СКРИПТА: ${error}`, true); logToPage(error);
                } finally {
                     const h2 = outputDiv.querySelector('h2'); if(h2) h2.textContent = 'Получение данных завершено.';
                }
            }
            runExample();
        </script>
    </body>
    </html>
    ```

### API

#### `getAuthorData(identifier, [page], [requestDelayMs], [proxyUrl], [proxyApiKey])`

Асинхронно получает данные профиля и стихи автора.

*   **`identifier`**: `string | number` - ID автора, имя пользователя, URL поддомена или URL пути.
*   **`page`**: `number | null` (Опционально) - Управляет загрузкой стихов: `null` (все), `0` (только профиль), `N > 0` (страница N). По умолчанию: `null`.
*   **`requestDelayMs`**: `number` (Опционально) - Задержка между запросами API при загрузке *всех* страниц (`page = null`). По умолчанию: `500`.
*   **`proxyUrl`**: `string | null` (Опционально) - URL вашего CORS-прокси. **Требуется для использования в браузере.** По умолчанию: `null`.
*   **`proxyApiKey`**: `string | null` (Опционально) - API-ключ для вашего CORS-прокси, если он нужен. Отправляется как заголовок `X-Proxy-Api-Key`. По умолчанию: `null`.
*   **Возвращает**: `Promise<StihirusResponse>` - Проверьте поле `status` (`'success'` или `'error'`).

#### `getAuthorFilters(identifier, [proxyUrl], [proxyApiKey])`

Асинхронно получает доступные опции фильтрации (рубрики и даты).

*   **`identifier`**: `string | number` - ID автора, имя пользователя, URL поддомена или URL пути.
*   **`proxyUrl`**: `string | null` (Опционально) - URL вашего CORS-прокси. **Требуется для использования в браузере.** По умолчанию: `null`.
*   **`proxyApiKey`**: `string | null` (Опционально) - API-ключ для вашего CORS-прокси, если он нужен. По умолчанию: `null`.
*   **Возвращает**: `Promise<StihirusFiltersResponse>` - Проверьте поле `status` (`'success'` или `'error'`).

**Структуры возвращаемых объектов:**

```typescript
// --- Ответ getAuthorData ---
// Успех: { status: 'success', data: StihirusAuthorData }
// Ошибка: { status: 'error', error: StihirusError }

// --- Ответ getAuthorFilters ---
// Успех: { status: 'success', data: StihirusAuthorFiltersData }
// Ошибка: { status: 'error', error: StihirusError }

// --- Детальные структуры ---
interface StihirusAuthorData {
  authorId: number;
  username: string;         // Отображаемое имя
  profileUrl: string;
  canonicalUsername: string;// Имя для URL
  description: string;
  avatarUrl: string | null;
  headerUrl: string | null;
  status: string;
  lastVisit: string;
  stats: StihirusAuthorStats;
  collections: StihirusCollectionInfo[];
  poems: StihirusPoem[];
}

interface StihirusPoem {
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
}

interface StihirusAuthorFiltersData {
  rubrics: StihirusFilterRubric[];
  dates: StihirusFilterDate[];
}

interface StihirusFilterRubric {
  id: number;    // ID для фильтрации
  name: string;
  count: number;
}

interface StihirusFilterDate {
  year: number;
  month: number; // 1-12
  count: number;
}

interface StihirusError {
  code: number;
  message: string;
  originalMessage?: string;
}

// Другие интерфейсы (StihirusAuthorStats, StihirusCollectionInfo, StihirusPoemRubric) определены в index.d.ts
```

### Важные замечания

*   **Неофициальный:** Использует веб-скрапинг и внутренние API. Изменения на сайте могут сломать модуль.
*   **Ограничение запросов:** Задержка 500мс по умолчанию между запросами при получении *всех* стихов (`page = null` в `getAuthorData`). Используйте ответственно.
*   **Обработка ошибок:** Возвращает `{ status: 'error', error: {...} }` при операционных ошибках, не выбрасывает их. Всегда проверяйте `status`.
*   **Использование в браузере:** Требует CORS-прокси. Передайте URL прокси и API-ключ (если нужен) в функции. Готовая собранная версия доступна через CDN.

### Лицензия

MIT
# Internet Companion

A Chrome extension that extracts article content from any page, sends it to a backend API, and displays the summary in a minimal dark overlay.

## Structure

```
internet-companion/
├── manifest.json          # Manifest V3
├── dist/
│   ├── content.js         # Pre-built content script (bundled)
│   └── background.js      # Pre-built service worker
├── src/
│   ├── content.ts         # Content script entry point
│   ├── background.ts      # Service worker
│   ├── extractor.ts       # @mozilla/readability extraction
│   ├── overlay.ts         # Overlay UI component
│   └── api.ts             # Backend API client
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `internet-companion/` folder
5. Click the extension icon on any article page to trigger it

The pre-built `dist/` files are included so the extension works immediately without a build step.

## Building from Source

Requires Node.js 18+.

```bash
npm install
npm run build
```

This compiles TypeScript and bundles `@mozilla/readability` into `dist/content.js`.

## Backend API

The extension currently POSTs to:

`https://internet-companion.ryuto-2007-11-27.workers.dev/api/analyze`

**Request:**
```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "text": "Full extracted article text..."
}
```

**Response:**
```json
{
  "summary": "A concise summary of the article..."
}
```

The worker implementation lives in `worker.ts` and already includes CORS headers for browser requests.

## Changing the API Endpoint

Edit `API_BASE_URL` in `src/api.ts`, then rebuild:

```bash
npm run build
```

That regenerates `dist/content.js`, which is the file Chrome actually loads.

## Usage

1. Navigate to any article or webpage
2. Click the **Internet Companion** icon in your Chrome toolbar
3. The dark panel slides in from the right with the summary
4. Click the × button or the icon again to toggle it closed
# internet-companion

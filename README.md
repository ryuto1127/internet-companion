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

The extension POSTs to `http://localhost:3000/api/analyze`.

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

### Example Backend (Node.js / Express)

```js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/analyze", async (req, res) => {
  const { url, title, text } = req.body;

  // Call your LLM or summarization service here
  const summary = await summarize(text);

  res.json({ summary });
});

app.listen(3000, () => console.log("API running on http://localhost:3000"));
```

## Changing the API Endpoint

Edit `API_BASE_URL` in:
- `src/api.ts` (TypeScript source)
- `dist/content.js` line 7 (pre-built, for immediate use)

## Usage

1. Navigate to any article or webpage
2. Click the **Internet Companion** icon in your Chrome toolbar
3. The dark panel slides in from the right with the summary
4. Click the × button or the icon again to toggle it closed
# internet-companion

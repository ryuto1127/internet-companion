# Internet Companion

A Chrome extension and Cloudflare Worker pair that turns any page into an AI browsing companion. It detects page context, summarizes content, answers questions about the current page, highlights a basic credibility signal, and offers a deeper topic brief.

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
│   ├── api.ts             # Backend API client
│   ├── credibility.ts     # Source credibility heuristics
│   ├── extractor.ts       # @mozilla/readability extraction
│   ├── overlay.ts         # Overlay UI component
│   ├── pageContext.ts     # Page-type detection
│   └── types.ts           # Shared frontend types
├── worker.ts              # Cloudflare Worker backend
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
5. Click the extension icon to toggle the companion on or off

The pre-built `dist/` files are included so the extension works immediately without a build step.

## Building from Source

Requires Node.js 18+.

```bash
npm install
npm run build
```

This compiles TypeScript and bundles `@mozilla/readability` into `dist/content.js`.

## Features

- Context-aware page behavior for news, Wikipedia, and general pages
- Ask AI about the page you are currently reading
- Basic source credibility indicator based on domain and source type
- Deep Dive mode for broader context and related angles
- Persistent on/off state with a compact overlay that shifts the page instead of covering it

## Backend API

The extension posts mode-based requests to:

`https://internet-companion.ryuto-2007-11-27.workers.dev/api/analyze`

Supported modes:

- `summary`
- `ask`
- `deep-dive`

Each request includes the extracted page text, detected page context, and credibility signal so the worker can adapt its response.

## OpenAI Model

The worker now uses the OpenAI Responses API when an `OPENAI_API_KEY` secret is available.

- Default model: `gpt-5-mini`
- Override model: set `OPENAI_MODEL`
- No API key: the worker falls back to a local extractive brief instead of failing outright

For a Cloudflare Worker deployment, add the key as a secret and redeploy:

```bash
wrangler secret put OPENAI_API_KEY
```

If you want a different model, set `OPENAI_MODEL` in your worker environment before deploying.

## Changing the API Endpoint

Edit `API_BASE_URL` in `src/api.ts`, then rebuild:

```bash
npm run build
```

That regenerates `dist/content.js`, which is the file Chrome actually loads.

## Usage

1. Navigate to any article or information-heavy webpage
2. Click the **Internet Companion** icon to turn the companion on
3. Read the generated summary, credibility signal, and context-specific brief
4. Ask questions in the overlay or trigger **Deep Dive**
5. Click the icon again to turn the companion off
# internet-companion

# Google Search Website Previews

Google Search Website Previews is a Chrome extension that adds live thumbnail previews next to organic Google Search results.

It helps you quickly scan result pages by showing a visual snapshot of each website before you click.

## What It Does

- Injects a preview card into Google Search results pages.
- Shows each result's site name and a screenshot thumbnail.
- Skips video-focused results (for cleaner and more relevant previews).
- Handles dynamic/infinite Google result loading with a MutationObserver.
- Includes a popup action to refresh previews on the active search page.

## How It Works

1. A content script runs on `https://www.google.com/search*`.
2. For each primary organic result, it builds a preview URL via `https://preview.coders.lt/api/screenshot?url=...`.
3. The background service worker fetches the preview response (cross-origin).
4. If generation is still in progress, the extension retries based on the `Refresh` header.
5. Once ready, the worker converts the image blob into a `data:` URL and sends it back.
6. The content script sets `<img src="data:...">` so previews render without page-initiated external image requests.

## Popup Features

The extension popup includes:

- Engine status indicator (Active)
- **Refresh Active Results** button to clear and regenerate previews on the current Google Search tab

## Context Menu Reload

- Right-click on a preview image and use **Reload preview image** from the extension menu.
- The extension sends a reload API call with `action=reload` and then refreshes matching previews on the page.

## Permissions Used

- `storage`
- `scripting`
- `contextMenus`
- Host permissions:
  - `https://www.google.com/search*`
  - `https://preview.coders.lt/*`

These are required to inject result previews and check screenshot availability.

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## Usage

1. Open Google Search.
2. Run any search query.
3. Browse results with visual website previews.
4. Open the extension popup and click **Refresh Active Results** if you want to regenerate previews.

## Project Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker for preview-status checks
- `content.js` - Result detection and preview injection logic
- `css/styles.css` - In-page preview styling
- `popup/popup.html` - Popup UI
- `popup/popup.css` - Popup styles
- `popup/popup.js` - Popup actions

## Notes

- This extension is built for Google Search result pages.
- Preview images are provided by the external service at `preview.coders.lt`.
- Preview fetches happen in the extension service worker, not directly from page `<img>` requests.

## Chrome Web Store Deployment Pipeline

This repository includes a GitHub Actions workflow at `.github/workflows/publish-chrome-webstore.yml`.

### Triggers

- Create a GitHub release, or push a tag, named after the version (`1.2.2` or `v1.2.2`)
- Manual run from the **Actions** tab via `workflow_dispatch`, with a `version` input

The version comes from the tag or the input and is written into `dist/manifest.json`. It must be higher than the published version. The `version` in the repository `manifest.json` is not used.

### Required GitHub Settings

Secrets:

- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`
- `CRX_PRIVATE_KEY` (optional) — PEM private key that signs the `.crx`. Without it, the workflow skips the `.crx`. Create one with `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out crx-key.pem` and keep the same key for every release.

Variables:

- `CWS_CLIENT_ID`
- `CWS_EXTENSION_ID`

The workflow packages `dist/` into `google-search-website-previews-<version>.zip` and, when `CRX_PRIVATE_KEY` is set, a signed `google-search-website-previews-<version>.crx`. On tag runs it attaches both to the GitHub release before it publishes the zip with `mobilefirstllc/cws-publish` (`action: publish`), so the release gets the packages even when the store rejects the upload.

The `.crx` is signed with your own key, so its extension ID is different from the Chrome Web Store ID. Chrome on Windows and macOS blocks `.crx` files from outside the store; use the zip for a manual install there.

### Manual install from a GitHub release

1. Download `google-search-website-previews-<version>.zip` from the release and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.

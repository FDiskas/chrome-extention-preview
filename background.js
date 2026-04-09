/**
 * Background Service Worker
 * Fetches preview images cross-origin and returns data URLs.
 * This bypasses CORS/CSP restrictions that apply to content scripts
 * and keeps page-level network logs cleaner.
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Invalid data URL result.'));
    };
    reader.onerror = () => {
      reject(reader.error || new Error('Failed to read blob as data URL.'));
    };
    reader.readAsDataURL(blob);
  });
}

const RELOAD_MENU_ID = 'reload-preview-image';
const PREVIEW_RELOAD_API = 'https://preview.coders.lt/api/reload?url=';
const CONTEXT_TTL_MS = 20 * 1000;
const lastPreviewContextByTab = new Map();

function createReloadContextMenu() {
  chrome.contextMenus.remove(RELOAD_MENU_ID, () => {
    chrome.contextMenus.create({
      id: RELOAD_MENU_ID,
      title: 'Reload preview image',
      contexts: ['image'],
      documentUrlPatterns: [
        '*://*.google.com/search*',
        '*://*.google.lt/search*'
      ]
    }, () => {
      // Ignore duplicate/remove errors during extension reloads.
      void chrome.runtime.lastError;
    });
  });
}

async function callReloadPreviewApi(targetUrl) {
  const reloadUrl = `${PREVIEW_RELOAD_API}${encodeURIComponent(targetUrl)}&action=reload`;

  const response = await fetch(reloadUrl, {
    method: 'POST',
    cache: 'no-store'
  });

  return {
    ok: response.ok,
    status: response.status
  };
}

createReloadContextMenu();

chrome.runtime.onInstalled.addListener(() => {
  createReloadContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createReloadContextMenu();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  lastPreviewContextByTab.delete(tabId);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== RELOAD_MENU_ID || !tab?.id) return;

  const context = lastPreviewContextByTab.get(tab.id);
  if (!context) return;

  if ((Date.now() - context.time) > CONTEXT_TTL_MS) {
    lastPreviewContextByTab.delete(tab.id);
    return;
  }

  try {
    await callReloadPreviewApi(context.targetUrl);
  } catch (error) {
    console.warn('Reload preview request failed:', error);
  }

  chrome.tabs.sendMessage(tab.id, {
    action: 'reloadPreviewImage',
    targetUrl: context.targetUrl
  }, () => {
    void chrome.runtime.lastError;
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clearPreviewContext') {
    const tabId = sender?.tab?.id;
    if (typeof tabId === 'number') {
      lastPreviewContextByTab.delete(tabId);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false });
    return;
  }

  if (request.action === 'setPreviewContext') {
    const tabId = sender?.tab?.id;
    if (typeof tabId === 'number' && typeof request.targetUrl === 'string' && request.targetUrl) {
      lastPreviewContextByTab.set(tabId, {
        targetUrl: request.targetUrl,
        time: Date.now()
      });
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false });
    return;
  }

  if (request.action === 'fetchPreviewData') {
    fetch(request.url, { method: 'GET', cache: 'no-store' })
      .then(async (response) => {
        const refresh = response.headers.get('Refresh') || response.headers.get('refresh');

        if (!response.ok) {
          sendResponse({
            ok: false,
            status: response.status,
            error: `HTTP ${response.status}`
          });
          return;
        }

        // Server says preview is still being generated.
        if (refresh) {
          sendResponse({
            ok: true,
            status: response.status,
            refresh
          });
          return;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          sendResponse({
            ok: false,
            status: response.status,
            error: `Unexpected content-type: ${contentType || 'unknown'}`
          });
          return;
        }

        const blob = await response.blob();
        if (!blob.size) {
          sendResponse({
            ok: false,
            status: response.status,
            error: 'Empty image payload.'
          });
          return;
        }

        const dataUrl = await blobToDataUrl(blob);
        sendResponse({
          ok: true,
          status: response.status,
          dataUrl
        });
      })
      .catch((error) => {
        console.error('Background fetch error:', error);
        sendResponse({ ok: false, error: error.message || 'Network error' });
      });

    return true;
  }
});

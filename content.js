const PREVIEW_API = 'https://preview.coders.lt/api/screenshot?url=';

function isRuntimeAvailable() {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

function isElement(value) {
  return typeof Element !== 'undefined' && value instanceof Element;
}

function clearLoadingState(wrapperElement, imgElement) {
  wrapperElement.classList.remove('gs-preview-loading');
  imgElement.classList.remove('gs-preview-reloading');
}

function finishLoadingState(wrapperElement, imgElement, loadingUntil) {
  const remainingMs = Math.max(0, loadingUntil - Date.now());

  if (remainingMs === 0) {
    clearLoadingState(wrapperElement, imgElement);
    return;
  }

  setTimeout(() => {
    if (!document.contains(wrapperElement)) return;
    clearLoadingState(wrapperElement, imgElement);
  }, remainingMs);
}

/**
 * Handles preview loading with support for the 'Refresh' HTTP header.
 * The background worker fetches remote images and returns a data URL.
 */
function loadPreviewWithRetry(url, imgElement, wrapperElement, options = {}) {
  const loadingUntil = options.loadingUntil || 0;
  const removeOnFail = options.removeOnFail !== false;

  if (!isRuntimeAvailable()) {
    if (removeOnFail) {
      wrapperElement.remove();
    } else {
      finishLoadingState(wrapperElement, imgElement, loadingUntil);
    }
    return;
  }

  // Use background script to check headers safely
  try {
    chrome.runtime.sendMessage({
      action: 'fetchPreviewData',
      url: url
    }, (response) => {
      // Content script can outlive extension updates; fail silently if invalidated.
      if (!isRuntimeAvailable()) {
        if (removeOnFail) {
          wrapperElement.remove();
        } else {
          finishLoadingState(wrapperElement, imgElement, loadingUntil);
        }
        return;
      }

      // 1. Handle communication errors
      if (chrome.runtime.lastError) {
        console.error('Extension message failed:', chrome.runtime.lastError.message || chrome.runtime.lastError);
        if (removeOnFail) {
          wrapperElement.remove();
        } else {
          finishLoadingState(wrapperElement, imgElement, loadingUntil);
        }
        return;
      }

      // 2. Handle API or network errors
      if (!response || !response.ok) {
        console.warn('Preview status check failed.');
        if (removeOnFail) {
          wrapperElement.remove();
        } else {
          finishLoadingState(wrapperElement, imgElement, loadingUntil);
        }
        return;
      }

      // 3. Handle Refresh instruction (generation in progress)
      if (response.refresh) {
        const seconds = parseInt(response.refresh.split(';')[0], 10) || 5;
        wrapperElement.classList.add('gs-preview-loading');

        setTimeout(() => {
          if (document.contains(wrapperElement)) {
            loadPreviewWithRetry(url, imgElement, wrapperElement, options);
          }
        }, seconds * 1000);
        return;
      }

      // 4. Success: Set the image from service-worker-provided data URL.
      if (!response.dataUrl) {
        if (removeOnFail) {
          wrapperElement.remove();
        } else {
          finishLoadingState(wrapperElement, imgElement, loadingUntil);
        }
        return;
      }

      imgElement.onload = () => {
        finishLoadingState(wrapperElement, imgElement, loadingUntil);
      };
      imgElement.onerror = () => {
        if (removeOnFail) {
          // If the actual image display fails, remove the placeholder
          wrapperElement.remove();
        } else {
          finishLoadingState(wrapperElement, imgElement, loadingUntil);
        }
      };
      imgElement.src = response.dataUrl;
    });
  } catch (error) {
    console.warn('Preview message skipped:', error?.message || error);
    if (removeOnFail) {
      wrapperElement.remove();
    } else {
      finishLoadingState(wrapperElement, imgElement, loadingUntil);
    }
  }
}

function getSiteName(link, container) {
  let siteNameFromResult = '';
  const headerElem = container.querySelector('[data-snhf="0"]');
  
  if (headerElem) {
    const nameSpans = headerElem.querySelectorAll('span:not([aria-hidden="true"])');
    for (const span of nameSpans) {
      if (span.children.length === 0) {
        siteNameFromResult = span.textContent?.trim();
        if (siteNameFromResult) break;
      }
    }
  }

  let siteName = siteNameFromResult;
  if (!siteName) {
    try {
      siteName = new URL(link.href).hostname.replace(/^www\./, '');
    } catch (e) {
      siteName = '';
    }
  }

  return siteName;
}

function resolveResultUrl(rawHref) {
  try {
    const parsed = new URL(rawHref, window.location.href);

    // Google can wrap outbound links as /url?q=<target>
    if (parsed.hostname.includes('google.') && parsed.pathname === '/url') {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target) return target;
    }

    return parsed.href;
  } catch (e) {
    return '';
  }
}

function isPrimaryResultLink(link, container) {
  if (!link || link.closest('.gs-preview-wrapper')) return false;

  const href = link.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;

  const looksLikeTitleLink =
    !!link.querySelector('h3') ||
    link.matches('a[jsname="UWckNb"][href]');

  if (!looksLikeTitleLink) return false;

  // We rely on container context passed down now
  return container ? container.contains(link) : true;
}

function isVideoResult(container, link) {
  const href = link.href.toLowerCase();
  const isKnownVideoHost = /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)/.test(href);
  if (isKnownVideoHost) return true;

  const hasVideoMarkup = Boolean(
    container.querySelector('g-video-preview, video, [aria-label*="video" i], [data-vid], [aria-label*="Play " i]')
  );
  if (hasVideoMarkup) return true;

  const section = container.closest('g-section-with-header, block-component, [data-hveid]');
  const sectionHeading = section?.querySelector('h2, h3, [role="heading"]')?.textContent?.trim().toLowerCase() || '';
  return sectionHeading === 'videos' || sectionHeading.includes('video');
}

/**
 * Injects a preview thumbnail into a search result.
 */
function injectPreview(link, container) {
  if (link.dataset.gsProcessed) return;
  link.dataset.gsProcessed = 'true';

  if (!container || container.querySelector('.gs-preview-wrapper')) return;

  if (isVideoResult(container, link)) return;

  const url = resolveResultUrl(link.href);
  if (!url) return;

  const urlObj = new URL(url);
  if (!/^https?:$/.test(urlObj.protocol)) return;
  if (/^www\.google\.[a-z.]{2,}$/.test(urlObj.hostname) && urlObj.pathname.startsWith('/search')) return;

  const siteName = getSiteName(link, container);

  const previewDiv = document.createElement('div');
  previewDiv.className = 'gs-preview-wrapper';
  previewDiv.title = 'Website preview';

  const thumbLink = document.createElement('a');
  thumbLink.className = 'gs-preview-thumb-link';
  thumbLink.href = url;
  thumbLink.target = '_blank';
  thumbLink.rel = 'noopener noreferrer';

  const siteBadge = document.createElement('div');
  siteBadge.className = 'gs-preview-site-name';
  siteBadge.textContent = siteName || 'Website';

  const imageFrame = document.createElement('div');
  imageFrame.className = 'gs-preview-image-frame gs-preview-loading';

  const img = document.createElement('img');
  img.className = 'gs-preview-image';
  img.dataset.previewTargetUrl = url;

  imageFrame.appendChild(img);
  thumbLink.appendChild(siteBadge);
  thumbLink.appendChild(imageFrame);

  previewDiv.appendChild(thumbLink);

  previewDiv.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Find the description container using the highly reliable data-sncf="1" attribute
  let descContainer = container.querySelector('[data-sncf="1"]');

  // Ultimate fallback to top-level if the specific structure isn't found
  if (!descContainer) {
    descContainer = container;
  }

  // We append a special class to the specific container we chose for scoping CSS later
  descContainer.classList.add('gs-desc-preview-layout');
  descContainer.insertBefore(previewDiv, descContainer.firstChild);

  // Start the smart loading process
  const previewUrl = `${PREVIEW_API}${encodeURIComponent(url)}`;
  loadPreviewWithRetry(previewUrl, img, imageFrame);
}

function reloadPreviewByTargetUrl(targetUrl) {
  if (!targetUrl) return;

  const images = document.querySelectorAll('.gs-preview-image');
  images.forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.previewTargetUrl !== targetUrl) return;

    const frame = img.closest('.gs-preview-image-frame');
    if (!(frame instanceof HTMLElement)) return;

    const loadingUntil = Date.now() + 5000;
    frame.classList.add('gs-preview-loading');
    img.classList.add('gs-preview-reloading');
    const previewUrl = `${PREVIEW_API}${encodeURIComponent(targetUrl)}`;
    loadPreviewWithRetry(previewUrl, img, frame, {
      loadingUntil,
      removeOnFail: false
    });
  });
}

function refreshAllPreviews() {
  document.querySelectorAll('.gs-preview-wrapper').forEach((preview) => preview.remove());

  const processedLinks = document.querySelectorAll('[data-gs-processed]');
  processedLinks.forEach((link) => {
    delete link.dataset.gsProcessed;
  });

  scheduleProcessResults();
}

/**
 * Scans the page for search results and processes them.
 */
function processResults() {
  // Find all result titles (H3 is the most stable selector for Google results)
  const titles = document.querySelectorAll('h3');

  titles.forEach(title => {
    // 1. Get the primary link (the parent 'a' of the 'h3')
    const link = title.closest('a[href]');
    if (!link || !isPrimaryResultLink(link)) return;

    // 2. Identify the unique container for this specific result.
    // We look for a wrapper that separates this result from others.
    // 'div[data-hveid]' is highly stable as it's used for Google's internal event tracking.
    const resultBlock = title.closest('[data-hveid], .g');
    if (!resultBlock) return;

    // 3. Inject preview into this specific block
    injectPreview(link, resultBlock);
  });
}

/**
 * Refined link validator to ensure we aren't hitting sidebar/widget links.
 */
function isPrimaryResultLink(link) {
  if (link.dataset.gsProcessed || link.closest('.gs-preview-wrapper')) return false;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('/search')) return false;

  // Primary links usually have a specific JS action name or are within an H3
  return !!link.querySelector('h3') || link.getAttribute('jsname') === 'UWckNb';
}

let processScheduled = false;

function scheduleProcessResults() {
  if (processScheduled) return;
  processScheduled = true;

  requestAnimationFrame(() => {
    processScheduled = false;
    processResults();
  });
}

document.addEventListener('contextmenu', (event) => {
  if (!isRuntimeAvailable()) return;
  if (!isElement(event.target)) return;

  const image = event.target.closest('.gs-preview-image');
  if (!(image instanceof HTMLImageElement)) {
    chrome.runtime.sendMessage({ action: 'clearPreviewContext' }, () => {
      void chrome.runtime.lastError;
    });
    return;
  }

  const targetUrl = image.dataset.previewTargetUrl;
  if (!targetUrl) return;

  chrome.runtime.sendMessage({
    action: 'setPreviewContext',
    targetUrl
  }, () => {
    void chrome.runtime.lastError;
  });
}, true);

if (isRuntimeAvailable()) {
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'reloadPreviewImage' && typeof request.targetUrl === 'string') {
      reloadPreviewByTargetUrl(request.targetUrl);
    }

    if (request.action === 'refreshAllPreviews') {
      refreshAllPreviews();
    }
  });
}

// Start processing immediately so we can catch early-rendered nodes.
scheduleProcessResults();

// Keep a few extra lifecycle hooks for cases where Google hydrates late.
if (document.readyState === 'loading') {
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      scheduleProcessResults();
    }
  });

  document.addEventListener('DOMContentLoaded', scheduleProcessResults, { once: true });
  window.addEventListener('load', scheduleProcessResults, { once: true });
}

// Robust observer to handle Google's infinite scrolling and dynamic updates
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldProcess = true;
      break;
    }
  }
  if (shouldProcess) {
    scheduleProcessResults();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

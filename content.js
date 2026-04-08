const PREVIEW_API = 'https://preview.coders.lt/api/screenshot?url=';

function isRuntimeAvailable() {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

/**
 * Handles image loading with support for the 'Refresh' HTTP header.
 * Uses a background script to bypass CORS/CSP restrictions.
 */
function loadPreviewWithRetry(url, imgElement, wrapperElement) {
  if (!isRuntimeAvailable()) {
    wrapperElement.remove();
    return;
  }

  // Use background script to check headers safely
  try {
    chrome.runtime.sendMessage({
      action: 'checkPreview',
      url: url
    }, (response) => {
      // Content script can outlive extension updates; fail silently if invalidated.
      if (!isRuntimeAvailable()) {
        wrapperElement.remove();
        return;
      }

      // 1. Handle communication errors
      if (chrome.runtime.lastError) {
        console.error('Extension message failed:', chrome.runtime.lastError.message || chrome.runtime.lastError);
        wrapperElement.remove();
        return;
      }

      // 2. Handle API or network errors
      if (!response || !response.ok) {
        console.warn('Preview status check failed.');
        wrapperElement.remove();
        return;
      }

      // 3. Handle Refresh instruction (Generation in progress)
      if (response.refresh) {
        const seconds = parseInt(response.refresh.split(';')[0], 10) || 5;
        wrapperElement.classList.add('gs-preview-loading');

        setTimeout(() => {
          if (document.contains(wrapperElement)) {
            loadPreviewWithRetry(url, imgElement, wrapperElement);
          }
        }, seconds * 1000);
        return;
      }

      // 4. Success: Set the final image source
      // The browser usually handles the actual image request for <img> tags
      // more leniently than fetch requests in terms of CORS.
      imgElement.src = url;
      imgElement.onload = () => {
        wrapperElement.classList.remove('gs-preview-loading');
      };
      imgElement.onerror = () => {
        // If the actual image display fails, remove the placeholder
        wrapperElement.remove();
      };
    });
  } catch (error) {
    console.warn('Preview message skipped:', error?.message || error);
    wrapperElement.remove();
  }
}

function getSiteName(link, container) {
  const siteNameFromResult = container.querySelector('.VuuXrf, .tjvcx, .NUnG9d span')?.textContent?.trim();

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

function isPrimaryResultLink(link) {
  if (!link || link.closest('.gs-preview-wrapper')) return false;

  const href = link.getAttribute('href') || '';
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;

  const looksLikeTitleLink =
    link.matches('.yuRUbf > a[href], a.zReHs[href], a[jsname="UWckNb"][href]') ||
    !!link.closest('.yuRUbf') ||
    !!link.querySelector('h3');

  if (!looksLikeTitleLink) return false;

  return !!link.closest('.MjjYud, .g');
}

function isVideoResult(container, link) {
  const href = link.href.toLowerCase();
  const isKnownVideoHost = /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)/.test(href);
  if (isKnownVideoHost) return true;

  const hasVideoMarkup = Boolean(
    container.querySelector('g-video-preview, video, [aria-label*="video" i], [data-vid]')
  );
  if (hasVideoMarkup) return true;

  const section = container.closest('g-section-with-header, block-component, [data-hveid]');
  const sectionHeading = section?.querySelector('h2, h3, [role="heading"]')?.textContent?.trim().toLowerCase() || '';
  return sectionHeading === 'videos' || sectionHeading.includes('video');
}

/**
 * Injects a preview thumbnail into a search result.
 */
function injectPreview(link) {
  if (link.dataset.gsProcessed) return;
  link.dataset.gsProcessed = 'true';

  const container = link.closest('.MjjYud') || link.closest('.g');
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

  imageFrame.appendChild(img);
  thumbLink.appendChild(siteBadge);
  thumbLink.appendChild(imageFrame);

  previewDiv.appendChild(thumbLink);

  previewDiv.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  container.classList.add('gs-preview-layout');

  const anchorPoint = container.querySelector('.yuRUbf')?.parentElement || container.firstElementChild;
  if (anchorPoint && anchorPoint.parentNode === container) {
    container.insertBefore(previewDiv, anchorPoint);
  } else {
    container.insertBefore(previewDiv, container.firstChild);
  }

  // Start the smart loading process
  const previewUrl = `${PREVIEW_API}${encodeURIComponent(url)}`;
  loadPreviewWithRetry(previewUrl, img, imageFrame);
}

/**
 * Scans the page for search results and processes them.
 */
function processResults() {
  // Target only the primary search results container to avoid UI breakage
  const rsoContainers = document.querySelectorAll('[data-async-context]#rso, #rso');

  rsoContainers.forEach(rso => {
    Array.from(rso.children).forEach(rsoChild => {
      // Only process children that contain exactly one nested div element
      const childElements = Array.from(rsoChild.children);
      const divChildren = childElements.filter(c => c.tagName.toLowerCase() === 'div');

      if (divChildren.length === 1 && childElements.length === 1) {
        const links = rsoChild.querySelectorAll('a[href]');
        links.forEach(link => {
          if (isPrimaryResultLink(link)) {
            injectPreview(link);
          }
        });
      }
    });
  });
}

// Initial processing when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', processResults);
} else {
  processResults();
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
    // Small delay to ensure the DOM is ready after injection
    requestAnimationFrame(processResults);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

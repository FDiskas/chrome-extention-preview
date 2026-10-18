import { CSS, PREVIEW_SCREENSHOT_API } from '../shared/constants.ts';
import {
	isGoogleSearchUrl,
	isGoogleUrl,
	isHttpUrl,
	parseDisplayedOrigin,
	resolveResultUrl,
	toOriginUrl,
} from '../shared/url.ts';
import { extractSiteName } from './site-name.ts';
import { isVideoResult } from './video-detector.ts';

export function injectPreview(
	link: HTMLAnchorElement,
	container: Element,
): void {
	if (link.dataset.gsProcessed) return;
	if (container.querySelector(`.${CSS.wrapper}`)) return;

	const url = resolveResultUrl(link.href, window.location.href);
	if (!url) return;

	const origin = findPreviewOrigin(url, container);
	if (!origin || isVideoResult(container, origin)) {
		link.dataset.gsProcessed = 'skip';
		return;
	}

	const descContainer = container.querySelector('[data-sncf="1"]');
	if (!descContainer) return;

	const siteName = extractSiteName(container, origin);
	const previewUrl = `${PREVIEW_SCREENSHOT_API}${encodeURIComponent(origin)}`;
	const wrapper = buildPreviewElement(url, siteName, previewUrl);

	descContainer.classList.add(CSS.descLayout);
	descContainer.insertBefore(wrapper, descContainer.firstChild);
	link.dataset.gsProcessed = 'true';
}

// Google links results through opaque /goto?url=<token> redirects, so the
// target origin is only available from the displayed breadcrumb (<cite>).
function findPreviewOrigin(url: string, container: Element): string {
	if (!isHttpUrl(url) || isGoogleSearchUrl(url)) return '';
	if (!isGoogleUrl(url)) return toOriginUrl(url);

	const displayedUrl = container.querySelector('cite')?.textContent ?? '';
	return parseDisplayedOrigin(displayedUrl);
}

function buildPreviewElement(
	targetUrl: string,
	siteName: string,
	previewUrl: string,
): HTMLDivElement {
	const wrapper = document.createElement('div');
	wrapper.className = CSS.wrapper;
	wrapper.title = 'Website preview';
	wrapper.addEventListener('click', (event) => event.stopPropagation());

	const thumbLink = document.createElement('a');
	thumbLink.className = CSS.thumbLink;
	thumbLink.href = targetUrl;
	thumbLink.target = '_blank';
	thumbLink.rel = 'noopener noreferrer';

	const siteBadge = document.createElement('div');
	siteBadge.className = CSS.siteName;
	siteBadge.textContent = siteName || 'Website';

	const imageFrame = document.createElement('div');
	imageFrame.className = `${CSS.imageFrame} ${CSS.loading}`;

	const image = document.createElement('img');
	image.className = CSS.image;
	image.alt = `Preview of ${siteBadge.textContent}`;
	image.loading = 'lazy';
	image.decoding = 'async';
	image.role = 'img';
	image.referrerPolicy = 'no-referrer';
	image.dataset.previewTargetUrl = targetUrl;

	image.addEventListener(
		'load',
		() => imageFrame.classList.remove(CSS.loading),
		{ once: true },
	);
	image.addEventListener('error', () => wrapper.remove(), { once: true });

	image.src = previewUrl;

	imageFrame.appendChild(image);
	thumbLink.appendChild(siteBadge);
	thumbLink.appendChild(imageFrame);
	wrapper.appendChild(thumbLink);

	return wrapper;
}

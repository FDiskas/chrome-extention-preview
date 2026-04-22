const VIDEO_HOST_PATTERN =
	/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)/;
const VIDEO_MARKUP_SELECTOR =
	'g-video-preview, video, [aria-label*="video" i], [data-vid], [aria-label*="Play " i]';
const VIDEO_SECTION_SELECTOR =
	'g-section-with-header, block-component, [data-hveid]';

export function isVideoResult(
	container: Element,
	link: HTMLAnchorElement,
): boolean {
	if (VIDEO_HOST_PATTERN.test(link.href.toLowerCase())) return true;
	if (container.querySelector(VIDEO_MARKUP_SELECTOR)) return true;

	const section = container.closest(VIDEO_SECTION_SELECTOR);
	const heading =
		section
			?.querySelector('h2, h3, [role="heading"]')
			?.textContent?.trim()
			.toLowerCase() ?? '';
	return heading === 'videos' || heading.includes('video');
}

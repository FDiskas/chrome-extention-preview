export function extractSiteName(container: Element, origin: string): string {
	return (
		extractFromResultHeader(container) ||
		new URL(origin).hostname.replace(/^www\./, '')
	);
}

function extractFromResultHeader(container: Element): string {
	const headerElem = container.querySelector('[data-snhf="0"]');
	if (!headerElem) return '';

	const nameSpans = headerElem.querySelectorAll(
		'span:not([aria-hidden="true"])',
	);
	for (const span of nameSpans) {
		if (span.children.length === 0) {
			const text = span.textContent?.trim();
			if (text) return text;
		}
	}
	return '';
}

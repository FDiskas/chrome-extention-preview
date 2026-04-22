export function extractSiteName(
	link: HTMLAnchorElement,
	container: Element,
): string {
	const fromHeader = extractFromResultHeader(container);
	if (fromHeader) return fromHeader;

	try {
		return new URL(link.href).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
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

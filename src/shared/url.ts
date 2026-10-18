const GOOGLE_HOST_PATTERN = /^([a-z0-9-]+\.)*google\.[a-z]{2,3}(\.[a-z]{2})?$/;
const HTTP_PROTOCOL_PATTERN = /^https?:$/;
const DISPLAYED_HOST_PATTERN =
	/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i;
const DISPLAYED_URL_SEPARATOR = /[\s›]/;

function parseUrl(url: string, baseHref?: string): URL | null {
	try {
		return new URL(url, baseHref);
	} catch {
		return null;
	}
}

function isGoogleHost(parsed: URL): boolean {
	return GOOGLE_HOST_PATTERN.test(parsed.hostname);
}

export function resolveResultUrl(rawHref: string, baseHref?: string): string {
	const parsed = parseUrl(rawHref, baseHref);
	if (!parsed) return '';

	if (isGoogleHost(parsed) && parsed.pathname === '/url') {
		const target =
			parsed.searchParams.get('q') || parsed.searchParams.get('url');
		if (target) return target;
	}

	return parsed.href;
}

export function isHttpUrl(url: string): boolean {
	const parsed = parseUrl(url);
	return parsed !== null && HTTP_PROTOCOL_PATTERN.test(parsed.protocol);
}

export function isGoogleUrl(url: string): boolean {
	const parsed = parseUrl(url);
	return parsed !== null && isGoogleHost(parsed);
}

export function isGoogleSearchUrl(url: string): boolean {
	const parsed = parseUrl(url);
	return (
		parsed !== null &&
		isGoogleHost(parsed) &&
		parsed.pathname.startsWith('/search')
	);
}

export function toOriginUrl(url: string): string {
	return parseUrl(url)?.origin ?? '';
}

export function parseDisplayedOrigin(displayedUrl: string): string {
	const [host = ''] = displayedUrl.trim().split(DISPLAYED_URL_SEPARATOR);
	if (!DISPLAYED_HOST_PATTERN.test(host)) return '';
	return toOriginUrl(/^https?:\/\//i.test(host) ? host : `https://${host}`);
}

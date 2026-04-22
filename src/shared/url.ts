const GOOGLE_REDIRECT_HOST_PATTERN = /(^|\.)google\./;

export function resolveResultUrl(rawHref: string, baseHref?: string): string {
	try {
		const parsed = new URL(rawHref, baseHref);

		if (
			GOOGLE_REDIRECT_HOST_PATTERN.test(parsed.hostname) &&
			parsed.pathname === '/url'
		) {
			const target =
				parsed.searchParams.get('q') ?? parsed.searchParams.get('url');
			if (target) return target;
		}

		return parsed.href;
	} catch {
		return '';
	}
}

export function isHttpUrl(url: string): boolean {
	try {
		return /^https?:$/.test(new URL(url).protocol);
	} catch {
		return false;
	}
}

export function isGoogleSearchUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return (
			/^www\.google\.[a-z.]{2,}$/.test(parsed.hostname) &&
			parsed.pathname.startsWith('/search')
		);
	} catch {
		return false;
	}
}

export function toOriginUrl(url: string): string {
	try {
		return new URL(url).origin;
	} catch {
		return '';
	}
}

export function isGoogleSearchPage(url: string | undefined): boolean {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return (
			parsed.hostname.startsWith('www.google.') &&
			parsed.pathname.startsWith('/search')
		);
	} catch {
		return false;
	}
}

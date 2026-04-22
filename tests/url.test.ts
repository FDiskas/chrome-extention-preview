import { describe, expect, test } from 'bun:test';
import {
	isGoogleSearchPage,
	isGoogleSearchUrl,
	isHttpUrl,
	resolveResultUrl,
	toOriginUrl,
} from '../src/shared/url.ts';

describe('resolveResultUrl', () => {
	test('returns direct https URL as-is', () => {
		expect(resolveResultUrl('https://example.com/page')).toBe(
			'https://example.com/page',
		);
	});

	test('unwraps google /url?q= redirect target', () => {
		const wrapped =
			'https://www.google.com/url?q=https://example.com/path&sa=U';
		expect(resolveResultUrl(wrapped)).toBe('https://example.com/path');
	});

	test('unwraps google /url?url= redirect target', () => {
		const wrapped = 'https://www.google.com/url?url=https://example.com/path';
		expect(resolveResultUrl(wrapped)).toBe('https://example.com/path');
	});

	test('resolves relative href against base', () => {
		expect(resolveResultUrl('/foo', 'https://example.com/')).toBe(
			'https://example.com/foo',
		);
	});

	test('returns empty string for invalid href', () => {
		expect(resolveResultUrl('not a url')).toBe('');
	});
});

describe('isHttpUrl', () => {
	test.each([
		['https://example.com', true],
		['http://example.com', true],
		['javascript:alert(1)', false],
		['chrome://settings', false],
		['ftp://example.com', false],
	])('isHttpUrl(%s) = %s', (url, expected) => {
		expect(isHttpUrl(url)).toBe(expected);
	});
});

describe('isGoogleSearchUrl', () => {
	test('detects google search host', () => {
		expect(isGoogleSearchUrl('https://www.google.com/search?q=test')).toBe(
			true,
		);
		expect(isGoogleSearchUrl('https://www.google.co.uk/search?q=test')).toBe(
			true,
		);
	});

	test('rejects non-search google paths', () => {
		expect(isGoogleSearchUrl('https://www.google.com/maps')).toBe(false);
	});

	test('rejects non-google hosts', () => {
		expect(isGoogleSearchUrl('https://example.com/search')).toBe(false);
	});
});

describe('toOriginUrl', () => {
	test('returns origin for url with path and query', () => {
		expect(toOriginUrl('https://example.com/foo/bar?x=1#frag')).toBe(
			'https://example.com',
		);
	});

	test('preserves non-default port', () => {
		expect(toOriginUrl('https://example.com:8443/a')).toBe(
			'https://example.com:8443',
		);
	});

	test('lowercases host', () => {
		expect(toOriginUrl('https://EXAMPLE.com/a')).toBe('https://example.com');
	});

	test('returns empty string for invalid url', () => {
		expect(toOriginUrl('not a url')).toBe('');
	});
});

describe('isGoogleSearchPage', () => {
	test('accepts www.google.* search page', () => {
		expect(isGoogleSearchPage('https://www.google.lt/search?q=test')).toBe(
			true,
		);
	});

	test('rejects undefined', () => {
		expect(isGoogleSearchPage(undefined)).toBe(false);
	});

	test('rejects malformed url', () => {
		expect(isGoogleSearchPage('not-a-url')).toBe(false);
	});
});

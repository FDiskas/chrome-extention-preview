import { describe, expect, test } from 'bun:test';
import {
	isGoogleSearchUrl,
	isGoogleUrl,
	isHttpUrl,
	parseDisplayedOrigin,
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

	test('falls back to url= when q= is present but empty', () => {
		const wrapped =
			'https://www.google.com/url?esrc=s&q=&rct=j&sa=U&url=https://en.wikipedia.org/wiki/Coders_at_Work';
		expect(resolveResultUrl(wrapped)).toBe(
			'https://en.wikipedia.org/wiki/Coders_at_Work',
		);
	});

	test('keeps /url on a non-google host', () => {
		const href = 'https://google.example.com/url?q=https://other.com';
		expect(resolveResultUrl(href)).toBe(href);
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

describe('isGoogleUrl', () => {
	test.each([
		['https://www.google.com/goto?url=CAESUgHrOzAV', true],
		['https://www.google.co.uk/url?q=x', true],
		['https://www.google.com.au/', true],
		['https://play.google.com/store', true],
		['https://google.lt/', true],
		['https://example.com/google.html', false],
		['https://google.example.com/', false],
		['https://notgoogle.com/', false],
		['not a url', false],
	])('isGoogleUrl(%s) = %s', (url, expected) => {
		expect(isGoogleUrl(url)).toBe(expected);
	});
});

describe('isGoogleSearchUrl', () => {
	test.each([
		['https://www.google.com/search?q=test', true],
		['https://www.google.co.uk/search?q=test', true],
		['https://google.com/search?q=test', true],
		['https://www.google.com/maps', false],
		['https://example.com/search', false],
		['https://google.example.com/search', false],
		['not a url', false],
	])('isGoogleSearchUrl(%s) = %s', (url, expected) => {
		expect(isGoogleSearchUrl(url)).toBe(expected);
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

describe('parseDisplayedOrigin', () => {
	test.each([
		['https://onlycoders.net', 'https://onlycoders.net'],
		[
			'https://www.britannica.com › dictionary › coder',
			'https://www.britannica.com',
		],
		[
			'https://www.allassignmenthelp.com › blog › what-do-co...',
			'https://www.allassignmenthelp.com',
		],
		['http://example.com:8080 › a', 'http://example.com:8080'],
		['example.org › path', 'https://example.org'],
		['9,9K+ followers', ''],
		['460+ followers', ''],
		['', ''],
	])('parseDisplayedOrigin(%s) = %s', (displayedUrl, expected) => {
		expect(parseDisplayedOrigin(displayedUrl)).toBe(expected);
	});
});

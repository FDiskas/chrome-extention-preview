import { CSS } from '../shared/constants.ts';

export function isPrimaryResultLink(link: HTMLAnchorElement): boolean {
	if (link.dataset.gsProcessed) return false;
	if (link.closest(`.${CSS.wrapper}`)) return false;

	const href = link.getAttribute('href');
	if (
		!href ||
		href.startsWith('#') ||
		href.startsWith('javascript:') ||
		href.startsWith('/search')
	) {
		return false;
	}

	return (
		Boolean(link.querySelector('h3')) ||
		link.getAttribute('jsname') === 'UWckNb'
	);
}

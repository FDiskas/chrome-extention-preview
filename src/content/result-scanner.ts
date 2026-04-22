import { CSS } from '../shared/constants.ts';
import { injectPreview } from './preview-injector.ts';
import { isPrimaryResultLink } from './result-link.ts';

export function processResults(): void {
	const titles = document.querySelectorAll('h3');

	for (const title of titles) {
		const link = title.closest('a[href]');
		if (!(link instanceof HTMLAnchorElement)) continue;

		const resultBlock = title.closest('[data-hveid], .g');
		if (!resultBlock) continue;

		if (
			link.dataset.gsProcessed === 'true' &&
			!resultBlock.querySelector(`.${CSS.wrapper}`)
		) {
			delete link.dataset.gsProcessed;
		}

		if (!isPrimaryResultLink(link)) continue;

		injectPreview(link, resultBlock);
	}
}

export function refreshAllPreviews(schedule: () => void): void {
	for (const preview of document.querySelectorAll(`.${CSS.wrapper}`)) {
		preview.remove();
	}
	for (const link of document.querySelectorAll<HTMLAnchorElement>(
		'[data-gs-processed]',
	)) {
		delete link.dataset.gsProcessed;
	}
	schedule();
}

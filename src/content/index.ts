import { isRuntimeAvailable } from '../shared/chrome-runtime.ts';
import type { RuntimeRequest } from '../shared/messages.ts';
import { processResults, refreshAllPreviews } from './result-scanner.ts';
import { createFrameScheduler } from './scheduler.ts';

const scheduleProcessResults = createFrameScheduler(processResults);

if (isRuntimeAvailable()) {
	chrome.runtime.onMessage.addListener((request: RuntimeRequest) => {
		if (request.action === 'refreshAllPreviews') {
			refreshAllPreviews(scheduleProcessResults);
		}
	});
}

scheduleProcessResults();

if (document.readyState === 'loading') {
	document.addEventListener('readystatechange', () => {
		if (document.readyState === 'interactive') {
			scheduleProcessResults();
		}
	});
	document.addEventListener('DOMContentLoaded', scheduleProcessResults, {
		once: true,
	});
	window.addEventListener('load', scheduleProcessResults, { once: true });
}

const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		if (mutation.addedNodes.length > 0) {
			scheduleProcessResults();
			return;
		}
	}
});

observer.observe(document.documentElement, { childList: true, subtree: true });

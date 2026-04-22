const FEEDBACK_DURATION_MS = 1500;
const FEEDBACK_COLOR = '#10b981';

const refreshButton = document.getElementById('refresh-previews');
if (refreshButton instanceof HTMLButtonElement) {
	refreshButton.addEventListener('click', () =>
		handleRefreshClick(refreshButton),
	);
}

async function handleRefreshClick(button: HTMLButtonElement): Promise<void> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (typeof tab?.id !== 'number') return;

	chrome.tabs.sendMessage(tab.id, { action: 'refreshAllPreviews' }, () => {
		void chrome.runtime.lastError;
	});

	showFeedback(button);
}

function showFeedback(button: HTMLButtonElement): void {
	const originalText = button.innerText;
	button.innerText = 'Refreshing...';
	button.style.background = FEEDBACK_COLOR;

	setTimeout(() => {
		button.innerText = originalText;
		button.style.background = '';
	}, FEEDBACK_DURATION_MS);
}

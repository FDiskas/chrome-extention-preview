export function isRuntimeAvailable(): boolean {
	return (
		typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id
	);
}

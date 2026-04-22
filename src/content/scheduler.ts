export function createFrameScheduler(task: () => void): () => void {
	let scheduled = false;
	return () => {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			task();
		});
	};
}

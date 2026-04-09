document.getElementById('refresh-previews').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let isGoogleSearch = false;
  try {
    if (tab?.url) {
      const parsed = new URL(tab.url);
      isGoogleSearch = parsed.hostname.startsWith('www.google.') && parsed.pathname.startsWith('/search');
    }
  } catch (error) {
    isGoogleSearch = false;
  }

  if (isGoogleSearch && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'refreshAllPreviews' }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Refresh message failed:', chrome.runtime.lastError.message || chrome.runtime.lastError);
      }
    });

    // Visual feedback on the button
    const btn = document.getElementById('refresh-previews');
    const originalText = btn.innerText;
    btn.innerText = 'Refreshing...';
    btn.style.background = '#10b981';
    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.background = '';
    }, 1500);
  } else {
    alert('Please use this on a Google Search results page.');
  }
});

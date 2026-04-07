document.getElementById('refresh-previews').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab.url && tab.url.includes('google.com/search')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Clear all previews and re-process
        document.querySelectorAll('.gs-preview-wrapper').forEach(p => p.remove());
        const processedLinks = document.querySelectorAll('[data-gs-processed]');
        processedLinks.forEach(link => {
          delete link.dataset.gsProcessed;
        });
        
        // Trigger the logic to run again
        if (typeof processResults === 'function') {
          processResults();
        } else {
          // If the script is already there but the function isn't globally exposed, 
          // we could just reload, but it's better to reload for a clean state.
          location.reload();
        }
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

/**
 * Background Service Worker
 * Handles cross-origin requests to check preview status.
 * This bypasses CORS/CSP restrictions that apply to content scripts.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkPreview') {
    // Perform the initial fetch to check headers
    fetch(request.url, { method: 'GET' })
      .then(response => {
        const refresh = response.headers.get('Refresh') || response.headers.get('refresh');
        
        sendResponse({ 
          ok: response.ok, 
          status: response.status,
          refresh: refresh 
        });
      })
      .catch(error => {
        console.error('Background fetch error:', error);
        sendResponse({ ok: false, error: error.message || 'Network error' });
      });
      
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});

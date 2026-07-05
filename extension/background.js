chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "FETCH_PROFILE") return false;

  (async () => {
    try {
      const response = await fetch(request.url, {
        headers: {
          Accept: "application/json"
        }
      });
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { error: text || "Non-JSON response" };
      }

      sendResponse({ success: true, ok: response.ok, status: response.status, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});

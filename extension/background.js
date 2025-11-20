console.log("🔥 BACKGROUND RUNNING");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ADD_CONTEXT") {
    console.log("[Background] Received:", msg.payload);

    chrome.storage.local.get(["contexts"], (data) => {
      const existing = data.contexts || [];

      const updated = [
        {
          text: msg.payload,
          createdAt: Date.now()
        },
        ...existing
      ];

      chrome.storage.local.set({ contexts: updated }, () => {
        console.log("[Background] Saved context.");
        sendResponse({ status: "ok", saved: msg.payload });
      });
    });

    return true; 
  }

  if (msg.type === "GET_CONTEXTS") {
    chrome.storage.local.get(["contexts"], (data) => {
      sendResponse(data.contexts || []);
    });
    return true;
  }
});

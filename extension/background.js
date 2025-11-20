let contextStore = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ADD_CONTEXT") {
    contextStore.push(msg.payload);

    chrome.storage.local.set({ contextStore });

    console.log("[Background] Added context:", msg.payload);
    console.log("[Background] Current contextStore:", contextStore);

    sendResponse({ status: "ok" });
  }

  return true;
});

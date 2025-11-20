import { saveMemory } from "./logic/db.js";

console.log("🔥 Background memory engine active");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "ADD_CONTEXT") {
        console.log("[Background] Storing memory:", msg.payload);

        const url = sender.tab?.url ? new URL(sender.tab.url) : null;
        const domain = url ? url.hostname : "unknown";

        saveMemory(msg.payload, {
            domain,
            importance: 1,
            source: "shortcut"
        }).then(memory => {
            console.log("[Background] Memory saved:", memory);
            sendResponse({ status: "ok", saved: memory });
        });

        return true;
    }

    if (msg.type === "EXPORT_ALL") {
        chrome.storage.local.get(null, (all) => {
            sendResponse(all);
        });
        return true;
    }
});

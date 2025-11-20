import { saveMemory } from "./logic/db.js";
import { autoAssemble } from "./logic/autoAssemble.js";

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

    if (msg.type === "GET_ASSEMBLED_CONTEXT") {
        const url = sender.tab?.url ? new URL(sender.tab.url) : null;
        const domain = url ? url.hostname : "unknown";

        autoAssemble({ query: "", domain })
          .then(assembly => {
            sendResponse({
              status: "ok",
              domain,
              finalContext: assembly.finalContext || "",
              includedChunks: assembly.includedChunks || [],
              relevanceScores: assembly.relevanceScores || {},
            });
          })
          .catch(err => {
            console.error("[Background] autoAssemble failed", err);
            sendResponse({ status: "error", error: String(err) });
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

chrome.commands.onCommand.addListener((command) => {
    if (command === "capture_context") {
        console.log("[Background] Hotkey pressed: capture_context");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "TRIGGER_CAPTURE" });
            }
        });
    }
});

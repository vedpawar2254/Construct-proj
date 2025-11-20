console.log("📌 Popup script loaded.knjbhjgvvkjbhj");

import { getSettings, getSummary, getRelevantMemories } from "../logic/db.js";

// ---------------------------
// Detect current tab domain
// ---------------------------
async function detectDomain() {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (!tabs || tabs.length === 0) return resolve("unknown");
                const url = new URL(tabs[0].url);
                resolve(url.hostname);
            });
        } catch (err) {
            console.error("❌ Failed to detect domain:", err);
            resolve("unknown");
        }
    });
}

// ---------------------------
// Assemble context
// ---------------------------
async function assembleContext(domain) {
    const settings = await getSettings();
    const summary = await getSummary(domain);
    const memories = await getRelevantMemories(domain, 5);

    let context = "";
    if (settings.systemPrompt) {
        context += `SYSTEM PROMPT:\n${settings.systemPrompt}\n\n`;
    }
    if (summary && summary.lastSummary) {
        context += `SUMMARY:\n${summary.lastSummary}\n\n`;
    }
    if (memories.length > 0) {
        context += `MEMORIES:\n`;
        memories.forEach(m => {
            context += `• ${m.text}\n`;
        });
        context += "\n";
    }

    return context.trim();
}

// ---------------------------
// Render context in popup
// ---------------------------
async function render() {
    const domain = await detectDomain();
    const domainEl = document.getElementById("domain");
    const contextEl = document.getElementById("contextPreview");

    if (!domainEl || !contextEl) {
        console.error("❌ Missing DOM elements for popup.");
        return;
    }

    domainEl.innerText = domain;

    const context = await assembleContext(domain);
    contextEl.value = context || "(No context available)";
}

// ---------------------------
// Setup event listeners
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
    const copyBtn = document.getElementById("copyBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const sendToMemoryBtn = document.getElementById("sendToMemoryBtn");

    if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
            const contextEl = document.getElementById("contextPreview");
            if (!contextEl) return;
            await navigator.clipboard.writeText(contextEl.value);
            alert("Copied to clipboard!");
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", render);
    }

    if (sendToMemoryBtn) {
        sendToMemoryBtn.addEventListener("click", async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) return;
                chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_CAPTURE" });
            } catch (err) {
                console.error("Failed to trigger capture from popup", err);
            }
        });
    }

    // Initial render
    render();
});

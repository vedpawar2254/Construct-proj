console.log("🔥 CONTENT SCRIPT INJECTED!");

function safeReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        fn();
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

safeReady(() => {
    console.log("📌 Content script fully ready.");

    document.addEventListener("keydown", (e) => {
        console.log(`KEYDOWN: ${e.key} meta: ${e.metaKey} shift: ${e.shiftKey}`);

        const isShortcut = e.metaKey && e.shiftKey && e.key.toLowerCase() === "u";
        if (!isShortcut) return;

        console.log("🚀 Shortcut fired!");

        const selection = window.getSelection();
        if (!selection) {
            console.warn("⚠ No selection object found.");
            return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText) {
            console.warn("⚠ Shortcut fired but no text selected.");
            return;
        }

        console.log("📤 Sending selected text to background:", selectedText);

        // Send message safely with full error handling
        chrome.runtime.sendMessage(
            {
                type: "ADD_CONTEXT",
                payload: selectedText
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Message delivery failed:", chrome.runtime.lastError);
                    return;
                }

                console.log("📥 Background responded:", response);
            }
        );
    });
});

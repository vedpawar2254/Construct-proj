console.log("🔥 CONTENT SCRIPT INJECTED!");

document.addEventListener("keydown", (e) => {
    console.log(`KEYDOWN: ${e.key} meta: ${e.metaKey} shift: ${e.shiftKey}`);

    const isShortcut = e.metaKey && e.shiftKey && e.key.toLowerCase() === "u";

    if (!isShortcut) return;

    console.log("🚀 Shortcut fired!");

    const selectedText = window.getSelection().toString().trim();

    if (!selectedText) {
        console.warn("⚠ Shortcut fired but no text selected.");
        return;
    }

    // SAFE SEND MESSAGE
    try {
        chrome.runtime.sendMessage(
            {
                type: "ADD_CONTEXT",
                payload: selectedText
            },
            (response) => {
                console.log("[ContentScript] Background response:", response);
            }
        );
    } catch (err) {
        console.error("❌ Failed to send message:", err);
    }
});

console.log("🔥 CONTENT SCRIPT INJECTED!");

// Utility to wait for document ready
function safeReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        fn();
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

// Utility: recursively find contenteditable elements including shadow roots
function findEditableElements(root = document) {
    let elements = [];
    if (root.querySelectorAll) {
        elements = Array.from(root.querySelectorAll("textarea, [contenteditable='true']"));
    }

    // Check shadow roots
    const shadowElements = [];
    root.querySelectorAll("*").forEach(el => {
        if (el.shadowRoot) {
            shadowElements.push(...findEditableElements(el.shadowRoot));
        }
    });

    return [...elements, ...shadowElements];
}

// Listen for keybinding
safeReady(() => {
    console.log("📌 Content script ready.");

    document.addEventListener("keydown", (e) => {
        // Shortcut: Meta + Shift + U
        const isShortcut = e.metaKey && e.shiftKey && e.key.toLowerCase() === "u";
        if (!isShortcut) return;

        console.log("🚀 Shortcut fired!");

        const selection = window.getSelection();
        let selectedText = selection ? selection.toString().trim() : "";

        // If nothing selected, try focused editable element
        if (!selectedText) {
            const active = document.activeElement;
            if (active && (active.tagName === "TEXTAREA" || active.isContentEditable)) {
                if (active.tagName === "TEXTAREA") selectedText = active.value.substring(active.selectionStart, active.selectionEnd);
                else selectedText = active.innerText || "";
            }
        }

        if (!selectedText) {
            console.warn("⚠ No text selected or focused.");
            return;
        }

        console.log("📤 Sending selected text to background:", selectedText);

        try {
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
        } catch (err) {
            console.error("❌ Failed to send message:", err);
        }
    });
});

// Optional: monitor dynamically added inputs (like ChatGPT message box)
const observer = new MutationObserver(() => {
    const edits = findEditableElements();
    if (edits.length > 0) console.log("✏️ Found editable elements:", edits);
});
observer.observe(document.body, { childList: true, subtree: true });

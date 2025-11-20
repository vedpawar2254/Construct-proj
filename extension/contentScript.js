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
function startObserver() {
    if (!document.body) return;
    const observer = new MutationObserver(() => {
        const edits = findEditableElements();
        if (edits.length > 0) console.log("✏️ Found editable elements:", edits);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

safeReady(startObserver);

// Listen for background trigger (Global Hotkey)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "TRIGGER_CAPTURE") {
        console.log(" Received TRIGGER_CAPTURE from background");

        const selection = window.getSelection();
        let selectedText = selection ? selection.toString().trim() : "";

        if (!selectedText) {
            const active = document.activeElement;
            if (active && (active.tagName === "TEXTAREA" || active.isContentEditable)) {
                if (active.tagName === "TEXTAREA") selectedText = active.value.substring(active.selectionStart, active.selectionEnd);
                else selectedText = active.innerText || "";
            }
        }

        if (selectedText) {
            console.log("out sending selected text:", selectedText);
            chrome.runtime.sendMessage({ type: "ADD_CONTEXT", payload: selectedText });
        } else {
            console.warn(" No text to capture.");
        }
    }
});

// ---------------------------
// ChatGPT auto-context injection
// ---------------------------
let cachedContext = "";
let cachedContextLoaded = false;

function findChatGPTInput() {
    // Try a few likely selectors for ChatGPT / OpenAI input
    let el = document.querySelector("textarea[data-id='chat-input']");

    if (!el) {
        el = document.querySelector("textarea[placeholder*='message'], textarea[placeholder*='Message']");
    }

    if (!el) {
        // Many UIs use a contenteditable div instead of a textarea
        el = document.querySelector("div[contenteditable='true'][data-testid='prompt-textarea']");
    }

    if (!el) {
        el = document.querySelector("div[contenteditable='true']");
    }

    if (!el) {
        console.log("[ContextisKing] ChatGPT input not found yet");
    } else {
        console.log("[ContextisKing] ChatGPT input detected", el);
    }

    return el || null;
}

function injectContextIntoInput(inputEl, context) {
    if (!inputEl || !context) return;

    const marker = "<!-- CONTEXT-AUTO -->";

    const isTextarea = inputEl.tagName === "TEXTAREA";
    const isEditableDiv = !isTextarea && inputEl.isContentEditable;

    const getCurrent = () => {
        if (isTextarea) return inputEl.value || "";
        if (isEditableDiv) return inputEl.textContent || "";
        return "";
    };

    const setCurrent = (val) => {
        if (isTextarea) {
            inputEl.value = val;
        } else if (isEditableDiv) {
            inputEl.textContent = val;
        }
    };

    const existing = getCurrent();
    if (existing.includes(marker)) return; // already injected

    const wrapped = `${marker}\n${context}\n<!-- END -->\n\n${existing}`;
    setCurrent(wrapped);

    const evt = new Event("input", { bubbles: true });
    inputEl.dispatchEvent(evt);
}

function setupChatGPTInjection() {
    if (window.location.hostname !== "chatgpt.com" && !window.location.hostname.endsWith("openai.com")) return;

    safeReady(() => {
        console.log("[ContextisKing] Setting up ChatGPT injection");

        // Prefetch assembled context once per ChatGPT tab
        try {
            if (chrome.runtime && chrome.runtime.id) {
                chrome.runtime.sendMessage({ type: "GET_ASSEMBLED_CONTEXT" }, (resp) => {
                    if (chrome.runtime.lastError) {
                        console.error("[ContextisKing] Prefetch failed", chrome.runtime.lastError);
                        return;
                    }
                    if (!resp || resp.status !== "ok" || !resp.finalContext) {
                        console.log("[ContextisKing] No assembled context to cache", resp);
                        return;
                    }
                    cachedContext = resp.finalContext;
                    cachedContextLoaded = true;
                    console.log("[ContextisKing] Cached assembled context");
                });
            }
        } catch (err) {
            console.error("[ContextisKing] Error prefetching context", err);
        }

        // On first Enter in the main prompt, prepend cached context, then let ChatGPT send normally
        document.addEventListener("keydown", (evt) => {
            if (evt.key !== "Enter" || evt.shiftKey || evt.isComposing) return;

            const target = evt.target;
            const inputEl = target.closest && target.closest("textarea, div[contenteditable='true']");
            if (!inputEl) return;

            // Only handle the main ChatGPT prompt area (heuristic: id or ProseMirror class)
            if (!inputEl.id && !inputEl.classList.contains("ProseMirror")) return;

            if (inputEl.dataset.contextInjected === "true") return; // already did it once

            const hasUserText = (inputEl.tagName === "TEXTAREA")
                ? (inputEl.value && inputEl.value.trim().length > 0)
                : (inputEl.textContent && inputEl.textContent.trim().length > 0);
            if (!hasUserText) return; // don't inject if they're not actually sending anything

            if (!cachedContextLoaded || !cachedContext) {
                console.log("[ContextisKing] No cached context yet, letting Enter pass");
                return;
            }

            console.log("[ContextisKing] Injecting cached context before send");
            injectContextIntoInput(inputEl, cachedContext);
            inputEl.dataset.contextInjected = "true";
            // We do NOT prevent default; ChatGPT will now send with the updated text.
        });
    });
}

setupChatGPTInjection();

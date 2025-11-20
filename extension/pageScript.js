(function() {
    function getActiveText() {
        const sel = window.getSelection()?.toString().trim();
        if (sel) return sel;

        const activeEl = document.activeElement;
        if (!activeEl) return "";

        if (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT") {
            return activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd).trim();
        }

        if (activeEl.isContentEditable) {
            return window.getSelection()?.toString().trim();
        }

        return "";
    }

    document.addEventListener("keydown", (e) => {
        if (!(e.metaKey && e.shiftKey && e.key.toLowerCase() === "u")) return;
        const text = getActiveText();
        if (!text) return;
        window.postMessage({ type: "ADD_CONTEXT", payload: text }, "*");
        console.log("📤 pageScript captured text:", text);
    });

    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        const msg = event.data;
        if (!msg || msg.type !== "INJECT_CONTEXT") return;

        // ChatGPT input
        const inputBox = document.querySelector("textarea[placeholder='Send a message…']");
        if (inputBox) {
            inputBox.focus();
            inputBox.value = msg.payload;
            inputBox.dispatchEvent(new Event("input", { bubbles: true }));
            console.log("✅ Injected context into ChatGPT input");
        }
    });
})();

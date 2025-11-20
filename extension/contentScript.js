window.addEventListener(
    "keydown",
    (e) => {
      console.log(
        "KEYDOWN:", 
        e.key, 
        "meta:", e.metaKey, 
        "shift:", e.shiftKey
      );
  
      const isCaptureShortcut =
        e.metaKey && 
        e.shiftKey &&
        e.key.toLowerCase() === "u";
  
      if (!isCaptureShortcut) return;
  
      console.log("🚀 Shortcut fired!");
  
      const selectedText = window.getSelection().toString().trim();
      if (!selectedText) {
        console.log("No text selected");
        return;
      }
  
      chrome.runtime.sendMessage(
        {
          type: "ADD_CONTEXT",
          payload: selectedText,
        },
        (response) => {
          console.log("[ContentScript] Sent:", selectedText);
          console.log("[ContentScript] Background response:", response);
        }
      );
    },
    { capture: true }
  );
  
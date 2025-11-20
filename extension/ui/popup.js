document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.sendMessage({ type: "GET_CONTEXTS" }, (contexts) => {
      const container = document.getElementById("contexts");
  
      if (!contexts || contexts.length === 0) {
        container.innerHTML = "<p>No contexts captured yet.</p>";
        return;
      }
  
      container.innerHTML = contexts
        .map(
          (ctx) => `
          <div class="ctx-item">
            <p>${ctx.text}</p>
            <small>${new Date(ctx.createdAt).toLocaleString()}</small>
          </div>
        `
        )
        .join("");
    });
  });
  
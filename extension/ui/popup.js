chrome.storage.local.get(["contextStore"], (data) => {
    const list = document.getElementById("list");
    const items = data.contextStore || [];
  
    items.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
  });
  
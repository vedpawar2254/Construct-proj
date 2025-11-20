import {
  getAllMemories,
  saveMemory,
  updateMemory,
  deleteMemory,
  searchMemories,
} from "../logic/db.js";

function parseTags(input) {
  if (!input) return [];
  return input
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
}

function formatTags(tags) {
  if (!Array.isArray(tags)) return "";
  return tags.join(", ");
}

function sortByUpdated(memories) {
  return [...memories].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function loadAndRenderMemories() {
  const queryInput = document.getElementById("filterQuery");
  const tagsInput = document.getElementById("filterTags");
  const importanceSelect = document.getElementById("filterImportance");

  const query = queryInput?.value?.trim() || "";
  const tags = parseTags(tagsInput?.value || "");
  const importanceFilter = importanceSelect?.value || "";

  let memoriesObj = await getAllMemories();
  let memories = Object.values(memoriesObj || {});

  if (query || tags.length > 0) {
    const searchResults = await searchMemories(query, { tags, limit: 9999 });
    const byId = new Set(searchResults.map(m => m.id));
    memories = memories.filter(m => byId.has(m.id));
  }

  if (importanceFilter) {
    const imp = Number(importanceFilter);
    memories = memories.filter(m => Number(m.importance || 0) === imp);
  }

  memories = sortByUpdated(memories);

  const listEl = document.getElementById("memoriesList");
  const countEl = document.getElementById("memCount");
  if (!listEl) return;

  listEl.innerHTML = "";
  countEl.textContent = String(memories.length);

  if (memories.length === 0) {
    const empty = document.createElement("div");
    empty.className = "small";
    empty.textContent = "No memories yet. Create one on the right.";
    listEl.appendChild(empty);
    return;
  }

  memories.forEach(mem => {
    const row = document.createElement("div");
    row.className = "memory-row";
    row.dataset.id = mem.id;

    const title = document.createElement("div");
    title.className = "memory-title";
    const textPreview = mem.summary || mem.text || "(empty)";
    title.textContent = textPreview.length > 120
      ? textPreview.slice(0, 117) + "..."
      : textPreview;

    const meta = document.createElement("div");
    meta.className = "memory-meta";

    const importanceLabel =
      mem.importance === 3 ? "High" : mem.importance === 1 ? "Low" : "Medium";

    const updated = mem.updatedAt
      ? new Date(mem.updatedAt).toLocaleString()
      : "";

    meta.textContent = `${importanceLabel} • ${updated}`;

    row.appendChild(title);
    row.appendChild(meta);

    if (mem.tags && mem.tags.length > 0) {
      const chips = document.createElement("div");
      chips.className = "chips";
      mem.tags.forEach(tag => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = tag;
        chips.appendChild(chip);
      });
      row.appendChild(chips);
    }

    row.addEventListener("click", () => {
      fillFormFromMemory(mem);
    });

    listEl.appendChild(row);
  });
}

function resetForm() {
  const formTitle = document.getElementById("formTitle");
  const idInput = document.getElementById("memoryId");
  const textInput = document.getElementById("memoryText");
  const summaryInput = document.getElementById("memorySummary");
  const impInput = document.getElementById("memoryImportance");
  const tagsInput = document.getElementById("memoryTags");
  const deleteBtn = document.getElementById("deleteBtn");

  if (formTitle) formTitle.textContent = "New memory";
  if (idInput) idInput.value = "";
  if (textInput) textInput.value = "";
  if (summaryInput) summaryInput.value = "";
  if (impInput) impInput.value = "2";
  if (tagsInput) tagsInput.value = "";
  if (deleteBtn) deleteBtn.disabled = true;
}

function fillFormFromMemory(mem) {
  const formTitle = document.getElementById("formTitle");
  const idInput = document.getElementById("memoryId");
  const textInput = document.getElementById("memoryText");
  const summaryInput = document.getElementById("memorySummary");
  const impInput = document.getElementById("memoryImportance");
  const tagsInput = document.getElementById("memoryTags");
  const deleteBtn = document.getElementById("deleteBtn");

  if (formTitle) formTitle.textContent = "Edit memory";
  if (idInput) idInput.value = mem.id;
  if (textInput) textInput.value = mem.text || "";
  if (summaryInput) summaryInput.value = mem.summary || "";
  if (impInput) impInput.value = String(mem.importance || 2);
  if (tagsInput) tagsInput.value = formatTags(mem.tags || []);
  if (deleteBtn) deleteBtn.disabled = false;
}

async function handleSubmit(evt) {
  evt.preventDefault();

  const idInput = document.getElementById("memoryId");
  const textInput = document.getElementById("memoryText");
  const summaryInput = document.getElementById("memorySummary");
  const impInput = document.getElementById("memoryImportance");
  const tagsInput = document.getElementById("memoryTags");

  const text = textInput.value.trim();
  if (!text) return;

  const summary = summaryInput.value.trim();
  const importance = Number(impInput.value || 2);
  const tags = parseTags(tagsInput.value);

  const existingId = idInput.value || null;

  if (existingId) {
    await updateMemory(existingId, { text, summary, importance, tags });
  } else {
    await saveMemory(text, { summary, importance, tags });
  }

  resetForm();
  await loadAndRenderMemories();
}

async function handleDelete() {
  const idInput = document.getElementById("memoryId");
  const id = idInput.value;
  if (!id) return;

  await deleteMemory(id);
  resetForm();
  await loadAndRenderMemories();
}

function setupFilters() {
  const queryInput = document.getElementById("filterQuery");
  const tagsInput = document.getElementById("filterTags");
  const importanceSelect = document.getElementById("filterImportance");

  [queryInput, tagsInput, importanceSelect].forEach(el => {
    if (!el) return;
    el.addEventListener("input", () => {
      loadAndRenderMemories();
    });
    if (el.tagName === "SELECT") {
      el.addEventListener("change", () => {
        loadAndRenderMemories();
      });
    }
  });
}

function setupForm() {
  const form = document.getElementById("memoryForm");
  const resetBtn = document.getElementById("resetBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetForm();
    });
  }
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      handleDelete();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupFilters();
  setupForm();
  resetForm();
  await loadAndRenderMemories();
});

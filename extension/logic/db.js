const STORAGE_KEYS = {
    MEMORIES: "memories",
    SUMMARIES: "summaries",
    SETTINGS: "settings",
  };
  
  // ----------------------
  // Utility
  // ----------------------
  function _generateId() {
    return crypto.randomUUID();
  }
  
  async function _load(key) {
    const res = await chrome.storage.local.get(key);
    return res[key] || {};
  }
  
  async function _save(key, data) {
    await chrome.storage.local.set({ [key]: data });
  }
  
  // ----------------------
  // Memory CRUD
  // ----------------------
  export async function saveMemory(text, metadata = {}) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
  
    const id = _generateId();
    memories[id] = {
      id,
      text,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      importance: metadata.importance || 1,
      domain: metadata.domain || null,
      tags: metadata.tags || [],
      source: metadata.source || "manual",
    };
  
    await _save(STORAGE_KEYS.MEMORIES, memories);
    return memories[id];
  }
  
  export async function getAllMemories() {
    return await _load(STORAGE_KEYS.MEMORIES);
  }
  
  export async function getMemoriesByDomain(domain) {
    const memories = await getAllMemories();
    return Object.values(memories).filter(m => m.domain === domain);
  }
  
  export async function deleteMemory(id) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
    delete memories[id];
    await _save(STORAGE_KEYS.MEMORIES, memories);
  }
  
  export async function updateMemory(id, newData) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
  
    if (!memories[id]) return null;
  
    memories[id] = {
      ...memories[id],
      ...newData,
      updatedAt: Date.now()
    };
  
    await _save(STORAGE_KEYS.MEMORIES, memories);
    return memories[id];
  }
  
  // ----------------------
  // Chat Summaries
  // ----------------------
  export async function saveSummary(domain, summary) {
    const summaries = await _load(STORAGE_KEYS.SUMMARIES);
  
    summaries[domain] = {
      lastSummary: summary,
      updatedAt: Date.now(),
    };
  
    await _save(STORAGE_KEYS.SUMMARIES, summaries);
  }
  
  export async function getSummary(domain) {
    const summaries = await _load(STORAGE_KEYS.SUMMARIES);
    return summaries[domain] || null;
  }
  
  // ----------------------
  // Settings Management
  // ----------------------
  export async function getSettings() {
    let settings = await _load(STORAGE_KEYS.SETTINGS);
  
    // initialize defaults
    if (!settings || Object.keys(settings).length === 0) {
      settings = {
        systemPrompt: "",
        autoAssembleEnabled: true,
        enabledDomains: [],
      };
      await _save(STORAGE_KEYS.SETTINGS, settings);
    }
  
    return settings;
  }
  
  export async function updateSettings(updateData) {
    const settings = await getSettings();
    const newSettings = { ...settings, ...updateData };
    await _save(STORAGE_KEYS.SETTINGS, newSettings);
    return newSettings;
  }
  
  // ----------------------
  // Export/Import
  // ----------------------
  export async function exportAllData() {
    const memories = await getAllMemories();
    const summaries = await _load(STORAGE_KEYS.SUMMARIES);
    const settings = await getSettings();
  
    return { memories, summaries, settings };
  }
  
  export async function importAllData(data) {
    if (data.memories) await _save(STORAGE_KEYS.MEMORIES, data.memories);
    if (data.summaries) await _save(STORAGE_KEYS.SUMMARIES, data.summaries);
    if (data.settings) await _save(STORAGE_KEYS.SETTINGS, data.settings);
  }
  
const STORAGE_KEYS = {
    MEMORIES: "memories",
    TAGS: "tags",
    SUMMARIES: "summaries",
    SETTINGS: "settings",
  };

  // Default memory importance levels
  const IMPORTANCE_LEVELS = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
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
    const now = Date.now();
    
    const memory = {
      id: metadata.id || _generateId(),
      text,
      summary: metadata.summary || '',
      importance: metadata.importance || IMPORTANCE_LEVELS.MEDIUM,
      lastUsed: metadata.lastUsed || now,
      tags: metadata.tags || [],
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      domain: metadata.domain || null,
      source: metadata.source || 'manual',
    };

    memories[memory.id] = memory;
    await _save(STORAGE_KEYS.MEMORIES, memories);
    
    // Update tags index
    if (memory.tags && memory.tags.length > 0) {
      await _updateTagsIndex(memory.tags, memory.id);
    }
    
    return memory;
  }


  export async function getAllMemories() {
    return await _load(STORAGE_KEYS.MEMORIES);
  }

  // ----------------------
// Relevance Scoring
// ----------------------
function _scoreMemory(memory, domain) {
    let score = 0;
    if (memory.domain === domain) score += 5;
  
    score += (memory.importance || 1) * 2;
  
    const ageMs = Date.now() - memory.updatedAt;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - ageDays); 
  
    return score;
  }



  
// ----------------------
// Retrieve Relevant Memories
// ----------------------
export async function getRelevantMemories(domain, limit = 5) {
    const memories = await getAllMemories();
    const memList = Object.values(memories);
  
    const scored = memList
      .map(m => ({
        ...m,
        score: _scoreMemory(m, domain)
      }))
      .sort((a, b) => b.score - a.score);
  
    return scored.slice(0, limit);
  }
  

  

  
  export async function getMemory(id) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
    return memories[id] || null;
  }
  
  export async function getMemoriesByDomain(domain) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
    return Object.values(memories).filter(m => m.domain === domain);
  }
  
  export async function updateMemoryUsage(id) {
    const memory = await getMemory(id);
    if (!memory) return null;
    
    return updateMemory(id, {
      lastUsed: Date.now(),
      usageCount: (memory.usageCount || 0) + 1
    });
  }
  
  export async function deleteMemory(id) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
    const memory = memories[id];
    
    if (!memory) return false;
    
    // Remove from tags index
    if (memory.tags && memory.tags.length > 0) {
      await _updateTagsIndex([], id, memory.tags);
    }
    
    // Delete the memory
    delete memories[id];
    await _save(STORAGE_KEYS.MEMORIES, memories);
    
    return true;
  }
  
  export async function updateMemory(id, updates) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
    
    if (!memories[id]) return null;
    
    const oldTags = memories[id].tags || [];
    const newTags = updates.tags || oldTags;
    
    // Update memory
    memories[id] = {
      ...memories[id],
      ...updates,
      updatedAt: Date.now()
    };
    
    await _save(STORAGE_KEYS.MEMORIES, memories);
    
    // Update tags index if tags were modified
    if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
      await _updateTagsIndex(newTags, id, oldTags);
    }
    
    return memories[id];
  }
  
  // ----------------------
  // Tag Management
  // ----------------------
  async function _updateTagsIndex(newTags, memoryId, oldTags = []) {
    const tags = await _load(STORAGE_KEYS.TAGS);
    
    // Remove from old tags
    oldTags.forEach(tag => {
      if (tags[tag]) {
        const index = tags[tag].indexOf(memoryId);
        if (index > -1) {
          tags[tag].splice(index, 1);
          if (tags[tag].length === 0) {
            delete tags[tag];
          }
        }
      }
    });
    
    // Add to new tags
    newTags.forEach(tag => {
      if (!tags[tag]) {
        tags[tag] = [];
      }
      if (!tags[tag].includes(memoryId)) {
        tags[tag].push(memoryId);
      }
    });
    
    await _save(STORAGE_KEYS.TAGS, tags);
  }
  
  export async function getMemoriesByTag(tag) {
    const tags = await _load(STORAGE_KEYS.TAGS);
    const memoryIds = tags[tag] || [];
    const memories = await _load(STORAGE_KEYS.MEMORIES);
    
    return memoryIds
      .map(id => memories[id])
      .filter(Boolean) // Filter out any undefined memories
      .sort((a, b) => b.lastUsed - a.lastUsed);
  }
  
  export async function getAllTags() {
    const tags = await _load(STORAGE_KEYS.TAGS);
    return Object.keys(tags).sort();
  }
  
  export async function searchMemories(query, options = {}) {
    const { limit = 10, tags = [] } = options;
    let memories = Object.values(await _load(STORAGE_KEYS.MEMORIES));
    
    // Filter by tags if provided
    if (tags.length > 0) {
      memories = memories.filter(memory => 
        tags.every(tag => memory.tags.includes(tag))
      );
    }
    
    // Simple text search (can be enhanced with more sophisticated search later)
    if (query) {
      const queryLower = query.toLowerCase();
      memories = memories.filter(memory => 
        memory.text.toLowerCase().includes(queryLower) ||
        (memory.summary && memory.summary.toLowerCase().includes(queryLower))
      );
    }
    
    // Sort by last used (most recent first)
    memories.sort((a, b) => b.lastUsed - a.lastUsed);
    
    return memories.slice(0, limit);
  }
  
  // ----------------------
  // Memory Summarization
  // ----------------------
  export async function updateMemorySummary(memoryId, summary) {
    const memories = await _load(STORAGE_KEYS.MEMORIES);
    
    if (!memories[memoryId]) return null;
    
    memories[memoryId] = {
      ...memories[memoryId],
      summary,
      updatedAt: Date.now()
    };
    
    await _save(STORAGE_KEYS.MEMORIES, memories);
    return memories[memoryId];
  }
  
  export async function generateMemorySummary(memoryId) {
    // This is a placeholder for AI-based summarization
    // In a real implementation, this would call an AI service
    const memory = await getMemory(memoryId);
    if (!memory) return null;
    
    // Simple truncation as fallback
    const summary = memory.text.length > 100 
      ? memory.text.substring(0, 97) + '...'
      : memory.text;
    
    return updateMemorySummary(memoryId, summary);
  }
  
  // ----------------------
  // Chat Summaries (legacy support)
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
  
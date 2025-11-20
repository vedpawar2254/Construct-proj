export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

export function scoreItem(query, item, options = {}) {
  const now = Date.now();
  const qTokens = tokenize(query);
  const text = item.text || "";
  const summary = item.summary || "";
  const body = `${summary}\n${text}`;
  const tokens = tokenize(body);

  let score = 0;

  if (qTokens.length && tokens.length) {
    const tokenSet = new Set(tokens);
    let overlap = 0;
    qTokens.forEach(t => {
      if (tokenSet.has(t)) overlap += 1;
    });
    score += overlap * 2;
  }

  if (options.tags && options.tags.length && Array.isArray(item.tags)) {
    let tagMatches = 0;
    options.tags.forEach(t => {
      if (item.tags.includes(t)) tagMatches += 1;
    });
    score += tagMatches * 3;
  }

  const importance = Number(item.importance || 1);
  score += importance * 2;

  if (item.lastUsed) {
    const ageMs = now - item.lastUsed;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 7 - ageDays);
    score += recencyBoost;
  }

  return score;
}

export function rankItems(query, items, options = {}) {
  return items
    .map(it => ({ ...it, _score: scoreItem(query, it, options) }))
    .sort((a, b) => b._score - a._score);
}

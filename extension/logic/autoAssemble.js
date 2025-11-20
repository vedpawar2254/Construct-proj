import { getAllMemories, getSettings } from "./db.js";
import { rankItems } from "./relevance.js";

export async function autoAssemble({ query, domain, maxItems = 8 } = {}) {
  const settings = await getSettings();
  const allMemoriesObj = await getAllMemories();
  const memories = Object.values(allMemoriesObj || {});

  // Note: We intentionally do NOT filter by domain.
  // Domain is only used for labeling in the final context, not for selection.
  const ranked = rankItems(query || "", memories, {});
  const top = ranked.slice(0, maxItems);

  const relevanceScores = {};
  top.forEach(m => {
    relevanceScores[m.id] = m._score;
  });

  const lines = [];

  if (settings.systemPrompt) {
    lines.push("SYSTEM PROMPT:");
    lines.push(settings.systemPrompt.trim());
    lines.push("");
  }

  if (domain) {
    lines.push(`DOMAIN: ${domain}`);
    lines.push("");
  }

  if (top.length) {
    lines.push("MEMORIES:");
    top.forEach(m => {
      const header = m.summary && m.summary.trim().length
        ? m.summary.trim()
        : (m.text || "").slice(0, 80);
      const body = m.text || "";
      lines.push(`- ${header}`);
      if (body && body !== header) {
        lines.push(body);
      }
      lines.push("");
    });
  }

  const finalContext = lines.join("\n").trim();
  const includedChunks = top.map(m => m.id);

  return {
    finalContext,
    includedChunks,
    relevanceScores,
  };
}

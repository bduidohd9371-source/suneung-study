const VOCAB_KEY = 'suneung-vocabulary-v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(VOCAB_KEY) || '{}'); } catch { return {}; }
}

export function readWordCards(subjectId) {
  const value = readAll()[subjectId];
  return Array.isArray(value) ? value : [];
}

export function saveWordCards(subjectId, sourceName, words, { dailyNewLimit = 0 } = {}) {
  try {
    const all = readAll();
    const createdAt = new Date().toISOString();
    const createdMs = Date.parse(createdAt);
    all[subjectId] = [...(Array.isArray(all[subjectId]) ? all[subjectId] : []), ...words.map((word, index) => ({
      id: globalThis.crypto?.randomUUID?.() || `word-${Date.now()}-${index}`,
      subjectId, sourceName: word.sourceName || sourceName, sourceSection: word.sourceSection || '', word: word.word.trim(), meaning: word.meaning.trim(),
      createdAt, dueAt: new Date(createdMs + (dailyNewLimit > 0 ? Math.floor(index / dailyNewLimit) * 86_400_000 : 0)).toISOString(), repetitions: 0, intervalDays: 0,
    }))];
    localStorage.setItem(VOCAB_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('suneung:vocabulary-updated'));
    return true;
  } catch { return false; }
}

export function rateWordCard(subjectId, cardId, rating) {
  try {
    const all = readAll();
    const cards = Array.isArray(all[subjectId]) ? all[subjectId] : [];
    const index = cards.findIndex((card) => card.id === cardId);
    if (index < 0) return false;
    const card = cards[index];
    const interval = rating === 'again' ? 0 : rating === 'easy' ? Math.min(60, Math.max(7, card.intervalDays * 2 || 7)) : Math.min(30, Math.max(1, Math.round(card.intervalDays * 2.2) || 1));
    card.intervalDays = interval;
    card.repetitions = rating === 'again' ? 0 : card.repetitions + 1;
    card.dueAt = new Date(Date.now() + (rating === 'again' ? 10 * 60_000 : interval * 86_400_000)).toISOString();
    card.lastReviewedAt = new Date().toISOString();
    localStorage.setItem(VOCAB_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('suneung:vocabulary-updated'));
    return true;
  } catch { return false; }
}

export function deleteWordCards(subjectId, sourceName) {
  try {
    const all = readAll();
    all[subjectId] = (Array.isArray(all[subjectId]) ? all[subjectId] : []).filter((card) => card.sourceName !== sourceName);
    localStorage.setItem(VOCAB_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('suneung:vocabulary-updated'));
    return true;
  } catch { return false; }
}

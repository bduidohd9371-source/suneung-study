const VOCAB_KEY = 'suneung-vocabulary-v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(VOCAB_KEY) || '{}'); } catch { return {}; }
}

export function readWordCards(subjectId) {
  const value = readAll()[subjectId];
  return Array.isArray(value) ? value : [];
}

function localDateKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getDailyWordCards(subjectId, date = localDateKey(), limit = 80) {
  const eligible = readWordCards(subjectId).filter((card) => !card.questLearnedAt && (!Number(card.repetitions) || Number(card.intervalDays) === 0));
  const daySeed = [...date].reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 7);
  let state = daySeed || 1;
  for (let index = eligible.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swap = state % (index + 1);
    [eligible[index], eligible[swap]] = [eligible[swap], eligible[index]];
  }
  return eligible.slice(0, Math.min(limit, eligible.length));
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

export function markQuestWordLearned(subjectId, cardId) {
  try {
    const all = readAll();
    const cards = Array.isArray(all[subjectId]) ? all[subjectId] : [];
    const card = cards.find((item) => item.id === cardId);
    if (!card) return false;
    const now = new Date();
    const interval = Math.min(30, Math.max(1, Math.round(card.intervalDays * 2.2) || 1));
    card.intervalDays = interval;
    card.repetitions = (Number(card.repetitions) || 0) + 1;
    card.dueAt = new Date(now.getTime() + interval * 86_400_000).toISOString();
    card.lastReviewedAt = now.toISOString();
    card.questLearnedAt = localDateKey(now);
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

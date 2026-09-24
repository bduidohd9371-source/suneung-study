const QUESTS_KEY = 'suneung-daily-quests-v1';

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(QUESTS_KEY) || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}

export function readQuestDay(date) {
  const day = readAll()[date];
  return day && typeof day === 'object'
    ? { completed: day.completed && typeof day.completed === 'object' ? day.completed : {}, dailyBonus: Number(day.dailyBonus) || 0 }
    : { completed: {}, dailyBonus: 0 };
}

export function completeQuest(date, questId, coreQuestIds) {
  try {
    const all = readAll();
    const day = all[date] && typeof all[date] === 'object' ? all[date] : { completed: {}, dailyBonus: 0 };
    const completed = day.completed && typeof day.completed === 'object' ? { ...day.completed } : {};
    if (completed[questId]) return { completed, dailyBonus: Number(day.dailyBonus) || 0 };
    completed[questId] = new Date().toISOString();
    const clearBonus = coreQuestIds.every((id) => Boolean(completed[id])) ? 10 : Number(day.dailyBonus) || 0;
    all[date] = { completed, dailyBonus: clearBonus };
    localStorage.setItem(QUESTS_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('suneung:quests-updated'));
    return { completed, dailyBonus: clearBonus };
  } catch { return null; }
}

export function getQuestBonusXp() {
  return Object.values(readAll()).reduce((total, day) => {
    const completedCount = day?.completed && typeof day.completed === 'object' ? Object.keys(day.completed).length : 0;
    return total + completedCount * 5 + (Number(day?.dailyBonus) || 0);
  }, 0);
}

export function getQuestStats() {
  const days = Object.values(readAll());
  return {
    completed: days.reduce((total, day) => total + (day?.completed && typeof day.completed === 'object' ? Object.keys(day.completed).length : 0), 0),
    fullClearDays: days.filter((day) => Number(day?.dailyBonus) >= 10).length,
  };
}

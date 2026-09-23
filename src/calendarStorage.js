const CALENDAR_KEY = 'suneung-calendar-v1';

export function readCalendarData() {
  try {
    const value = JSON.parse(localStorage.getItem(CALENDAR_KEY) || '{}');
    return { logs: Array.isArray(value.logs) ? value.logs : [], events: Array.isArray(value.events) ? value.events : [], plans: Array.isArray(value.plans) ? value.plans : [], sleep: value.sleep && typeof value.sleep === 'object' ? value.sleep : {}, weekGoals: value.weekGoals && typeof value.weekGoals === 'object' ? value.weekGoals : {}, diagnostics: value.diagnostics && typeof value.diagnostics === 'object' ? value.diagnostics : {} };
  } catch { return { logs: [], events: [], plans: [], sleep: {}, weekGoals: {}, diagnostics: {} }; }
}

export function writeCalendarData(data) {
  try {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('suneung:calendar-updated'));
    return true;
  } catch { return false; }
}

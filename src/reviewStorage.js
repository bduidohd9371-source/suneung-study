import mockQuestions from './data/mockQuestions.json';
import { readAttempts, readImportedQuestions } from './studyStorage.js';

const REVIEW_STATE_KEY = 'suneung-spaced-review-v1';
const DAY = 86_400_000;

function readStates() {
  try {
    const value = JSON.parse(localStorage.getItem(REVIEW_STATE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}

function resolveQuestion(questionId, subjectId) {
  if (!questionId || String(questionId).startsWith('pdf:')) return null;
  return [...mockQuestions, ...readImportedQuestions(subjectId)].find((question) => question.id === questionId) || null;
}

function initialReviewState(createdAt) {
  const wrongAt = new Date(createdAt || Date.now());
  const scheduleDates = [1, 3, 7].map((days) => new Date(wrongAt.getTime() + days * DAY).toISOString());
  return { repetitions: 0, intervalDays: 1, wrongAt: wrongAt.toISOString(), scheduleDates, dueAt: scheduleDates[0] };
}

function dayLabel(value, now = Date.now()) {
  const date = new Date(value);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / DAY);
  return days === 0 ? '오늘' : days > 0 ? `D-${days}` : `${Math.abs(days)}일 지남`;
}

export function getDueReviews(now = Date.now()) {
  const states = readStates();
  let migrated = false;
  const due = readAttempts().flatMap((attempt) => (attempt.wrongReviews || []).map((review, index) => {
    const key = `${attempt.id}:${review.questionId || review.questionNumber || index + 1}`;
    if (!states[key]) { states[key] = initialReviewState(attempt.createdAt); migrated = true; }
    const state = states[key];
    return { key, attempt, review, state, schedule: (state.scheduleDates || initialReviewState(attempt.createdAt).scheduleDates).map((date, index) => ({ day: [1, 3, 7][index], date, label: dayLabel(date, now) })), dueLabel: dayLabel(state.dueAt, now), question: resolveQuestion(review.questionId, attempt.subjectId) };
  }));
  if (migrated) { try { localStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(states)); } catch { /* due dates can be derived from the original attempt */ } }
  return due.filter((item) => new Date(item.state.dueAt).getTime() <= now).sort((a, b) => new Date(a.state.dueAt) - new Date(b.state.dueAt));
}

export function getNextReviewAt() {
  const states = readStates();
  return readAttempts().flatMap((attempt) => (attempt.wrongReviews || []).map((review, index) => {
    const key = `${attempt.id}:${review.questionId || review.questionNumber || index + 1}`;
    return states[key]?.dueAt || initialReviewState(attempt.createdAt).dueAt;
  })).sort((a, b) => new Date(a) - new Date(b))[0] || null;
}

export function rateReview(key, rating) {
  const states = readStates();
  const attempt = readAttempts().find((item) => key.startsWith(`${item.id}:`));
  const reviewIndex = attempt?.wrongReviews?.findIndex((review, index) => `${attempt.id}:${review.questionId || review.questionNumber || index + 1}` === key) ?? -1;
  const previous = states[key] || initialReviewState(attempt?.createdAt);
  const repetitions = rating === 'again' ? 0 : previous.repetitions + 1;
  const goodIntervals = [3, 7, 14, 30, 60];
  const easyIntervals = [7, 14, 30, 60];
  const intervalDays = rating === 'again' ? 1 : rating === 'hard' ? Math.max(1, Math.round((previous.intervalDays || 1) * 1.5)) : rating === 'easy' ? easyIntervals[Math.min(previous.repetitions, easyIntervals.length - 1)] : goodIntervals[Math.min(repetitions - 1, goodIntervals.length - 1)];
  states[key] = { ...previous, repetitions, intervalDays, lastReviewedAt: new Date().toISOString(), dueAt: new Date(Date.now() + intervalDays * DAY).toISOString(), ...(reviewIndex >= 0 ? { scheduleDates: previous.scheduleDates || initialReviewState(attempt.createdAt).scheduleDates } : {}) };
  try {
    localStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(states));
    window.dispatchEvent(new Event('suneung:reviews-updated'));
    return true;
  } catch { return false; }
}

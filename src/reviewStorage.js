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

export function getDueReviews(now = Date.now()) {
  const states = readStates();
  return readAttempts().flatMap((attempt) => (attempt.wrongReviews || []).map((review, index) => {
    const key = `${attempt.id}:${review.questionId || review.questionNumber || index + 1}`;
    const state = states[key] || { repetitions: 0, intervalDays: 1, dueAt: new Date(new Date(attempt.createdAt).getTime() + DAY).toISOString() };
    return { key, attempt, review, state, question: resolveQuestion(review.questionId, attempt.subjectId) };
  })).filter((item) => new Date(item.state.dueAt).getTime() <= now).sort((a, b) => new Date(a.state.dueAt) - new Date(b.state.dueAt));
}

export function getNextReviewAt() {
  const states = readStates();
  return readAttempts().flatMap((attempt) => (attempt.wrongReviews || []).map((review, index) => {
    const key = `${attempt.id}:${review.questionId || review.questionNumber || index + 1}`;
    return states[key]?.dueAt || new Date(new Date(attempt.createdAt).getTime() + DAY).toISOString();
  })).sort((a, b) => new Date(a) - new Date(b))[0] || null;
}

export function rateReview(key, rating) {
  const states = readStates();
  const previous = states[key] || { repetitions: 0, intervalDays: 1 };
  const repetitions = rating === 'again' ? 0 : previous.repetitions + 1;
  const goodIntervals = [3, 7, 14, 30, 60];
  const easyIntervals = [7, 14, 30, 60];
  const intervalDays = rating === 'again' ? 1 : rating === 'hard' ? Math.max(1, Math.round((previous.intervalDays || 1) * 1.5)) : rating === 'easy' ? easyIntervals[Math.min(previous.repetitions, easyIntervals.length - 1)] : goodIntervals[Math.min(repetitions - 1, goodIntervals.length - 1)];
  states[key] = { repetitions, intervalDays, lastReviewedAt: new Date().toISOString(), dueAt: new Date(Date.now() + intervalDays * DAY).toISOString() };
  try {
    localStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(states));
    window.dispatchEvent(new Event('suneung:reviews-updated'));
    return true;
  } catch { return false; }
}

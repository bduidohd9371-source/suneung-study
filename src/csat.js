// 2027학년도 수능: 2026-11-19 (교육부 발표)
export const CSAT_DATE = '2026-11-19T08:40:00+09:00';

// 현행 수능 표준 시험 시간. 탐구 선택 과목은 각각 30분입니다.
export const SUBJECTS = [
  { id: 'korean', name: '국어', detail: '1교시 · 45문항', minutes: 80, icon: '文', color: 'coral' },
  { id: 'math', name: '수학', detail: '2교시 · 30문항', minutes: 100, icon: '∑', color: 'blue' },
  { id: 'english', name: '영어', detail: '3교시 · 45문항', minutes: 70, icon: 'A', color: 'mint' },
  { id: 'ethics', name: '윤리', detail: '탐구 선택과목 · 20문항', minutes: 30, icon: '☯', color: 'violet' },
  { id: 'social', name: '사회', detail: '탐구 선택과목 · 20문항', minutes: 30, icon: '◎', color: 'amber' },
];

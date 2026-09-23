import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Pause, Play, RotateCcw } from 'lucide-react';
import { readCalendarData, writeCalendarData } from './calendarStorage.js';

const ROUTINES = [
  { id: 'english', subjectId: 'english', subjectName: '영어', activity: '영단어 외우기', minutes: 10, title: '영단어 10분' },
  { id: 'korean', subjectId: 'korean', subjectName: '국어', activity: '국어 독서 지문 풀기', minutes: 25, title: '국어 지문 25분' },
];
const pad = (number) => String(number).padStart(2, '0');
const getLocalDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function formatTime(seconds) {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

export default function QuickStart() {
  const [routineId, setRoutineId] = useState('english');
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('하나만 골라 바로 시작해요.');
  const saved = useRef(false);
  const routine = ROUTINES.find((item) => item.id === routineId) || ROUTINES[0];
  const targetSeconds = routine.minutes * 60;
  const remaining = Math.max(0, targetSeconds - elapsed);

  function saveSession(finalElapsed = elapsed) {
    if (saved.current || finalElapsed < 1) return;
    saved.current = true;
    const calendar = readCalendarData();
    const minutes = Math.max(1, Math.round(finalElapsed / 60));
    const log = {
      id: globalThis.crypto?.randomUUID?.() || `focus-${Date.now()}`,
      date: getLocalDate(new Date()), subjectId: routine.subjectId, subjectName: routine.subjectName,
      minutes, amount: '', unit: '문항', activity: routine.activity, label: '집중 타이머',
    };
    writeCalendarData({ ...calendar, logs: [...calendar.logs, log] });
    setRunning(false);
    setActive(false);
    setElapsed(0);
    setMessage(`${routine.subjectName} ${minutes}분을 달력에 저장했어요. 잘 시작했어요!`);
  }

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setElapsed((value) => Math.min(targetSeconds, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, targetSeconds]);

  useEffect(() => {
    if (active && elapsed >= targetSeconds && targetSeconds > 0) saveSession(targetSeconds);
  }, [active, elapsed, targetSeconds]);

  function start() {
    saved.current = false;
    setElapsed(0);
    setActive(true);
    setRunning(true);
    setMessage(`${routine.title} 집중 중`);
  }

  function changeRoutine(id) {
    if (active) return;
    setRoutineId(id);
    setElapsed(0);
    setMessage('하나만 골라 바로 시작해요.');
  }

  function abandon() {
    setRunning(false);
    setActive(false);
    setElapsed(0);
    setMessage('기록을 저장하지 않았어요. 괜찮아요, 다시 시작하면 돼요.');
  }

  const progress = active ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;

  return <section className="quick-start-card" aria-label="오늘 공부 바로 시작">
    <div className="quick-start-copy"><span className="quick-start-icon"><BookOpen size={17} /></span><div><span className="eyebrow">ONE SMALL START</span><h2>오늘, 하나만 시작해요</h2><p>{message}</p></div></div>
    {!active ? <>
      <div className="quick-start-options" role="group" aria-label="시작할 루틴 선택">
        {ROUTINES.map((item) => <button key={item.id} className={`quick-start-option ${routineId === item.id ? 'selected' : ''}`} onClick={() => changeRoutine(item.id)} aria-pressed={routineId === item.id}><strong>{item.title}</strong><small>{item.subjectName === '영어' ? '기상 직후 가볍게' : '스카에서 첫 공부'}</small></button>)}
      </div>
      <button className="button button-primary quick-start-main" onClick={start}><Play size={15} fill="currentColor" /> 오늘 시작</button>
    </> : <div className="quick-session">
      <div className="quick-session-clock" role="timer" aria-live="off">{formatTime(remaining)}</div>
      <div className="quick-session-progress" role="progressbar" aria-label="집중 시간 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>
      <div className="quick-session-actions"><button className="button button-secondary" onClick={() => setRunning((value) => !value)}>{running ? <><Pause size={14} /> 잠깐 멈춤</> : <><Play size={14} /> 계속하기</>}</button><button className="button button-primary" onClick={() => saveSession()} disabled={elapsed < 1}><Check size={14} /> 완료하고 저장</button><button className="quick-abandon" onClick={abandon} aria-label="저장하지 않고 취소"><RotateCcw size={14} /></button></div>
    </div>}
  </section>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, Check, Clock3, Pause, Play, RotateCcw, Sparkles, Target, Zap } from 'lucide-react';
import { readCalendarData, writeCalendarData } from './calendarStorage.js';
import { readAttempts } from './studyStorage.js';
import { completeQuest, readQuestDay } from './questStorage.js';
import { getDailyWordCards, markQuestWordLearned, rateWordCard } from './vocabStorage.js';

const CORE_QUEST_IDS = ['english-words', 'korean-reading', 'daily-focus'];
const FOCUS_ROTATION = [
  { subjectId: 'math', subjectName: '수학', title: '미적분 개념 복습', activity: '미적분 개념 복습' },
  { subjectId: 'ethics', subjectName: '생활과 윤리', title: '생활과 윤리 개념 복습', activity: '생활과 윤리 개념 복습' },
  { subjectId: 'math', subjectName: '수학', title: '미적분 문제 풀이', activity: '미적분 문제 풀이' },
  { subjectId: 'social', subjectName: '사회문화', title: '사회문화 개념 복습', activity: '사회문화 개념 복습' },
  { subjectId: 'math', subjectName: '수학', title: '미적분 오답 복습', activity: '미적분 오답 복습' },
  { subjectId: 'ethics', subjectName: '생활과 윤리', title: '생활과 윤리 기출 복습', activity: '생활과 윤리 기출 복습' },
  { subjectId: 'social', subjectName: '사회문화', title: '사회문화 기출 복습', activity: '사회문화 기출 복습' },
];

const pad = (number) => String(number).padStart(2, '0');
const getLocalDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function formatTime(seconds) {
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

function getDailyQuests(date, includeReview) {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(year, month - 1, day, 12).getDay();
  const focus = FOCUS_ROTATION[(weekday + 6) % 7];
  const quests = [
    { id: CORE_QUEST_IDS[0], icon: <BookOpen size={17} />, subjectId: 'english', subjectName: '영어', title: '영단어 80개 외우기', cue: '기상 후', activity: '수능 영단어 복습', minutes: 0, core: true, wordQuest: true },
    { id: CORE_QUEST_IDS[1], icon: <BookOpen size={17} />, subjectId: 'korean', subjectName: '국어', title: '독서 지문 풀기', cue: '첫 공부 시작할 때', activity: '국어 독서 지문 풀기', minutes: 25, core: true },
    { id: CORE_QUEST_IDS[2], icon: <Target size={17} />, ...focus, cue: '오늘의 집중 과목', minutes: 25, core: true },
  ];
  if (includeReview) quests.push({ id: 'wrong-review', icon: <Sparkles size={17} />, subjectId: 'review', subjectName: '복습', title: '오늘 틀린 문제 하나 다시 풀기', cue: '선택 보너스 퀘스트', activity: '오답 하나 다시 풀기', minutes: 10, core: false });
  return quests;
}

export default function QuickStart() {
  const [today, setToday] = useState(() => getLocalDate(new Date()));
  const [questDay, setQuestDay] = useState(() => readQuestDay(getLocalDate(new Date())));
  const [reviewAvailable, setReviewAvailable] = useState(false);
  const [activeQuestId, setActiveQuestId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('오늘 할 일은 세 개면 충분해요. 하나씩 시작해요.');
  const [wordSession, setWordSession] = useState(null);
  const [wordCards, setWordCards] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordRevealed, setWordRevealed] = useState(false);
  const saved = useRef(false);

  useEffect(() => {
    const syncDate = () => setToday(getLocalDate(new Date()));
    const interval = window.setInterval(syncDate, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setQuestDay(readQuestDay(today));
    const hasWrongToday = readAttempts().some((attempt) => getLocalDate(new Date(attempt.createdAt)) === today && (attempt.wrongReviews || []).length > 0);
    setReviewAvailable(hasWrongToday);
  }, [today]);

  useEffect(() => {
    const sync = () => {
      setQuestDay(readQuestDay(today));
      setReviewAvailable(readAttempts().some((attempt) => getLocalDate(new Date(attempt.createdAt)) === today && (attempt.wrongReviews || []).length > 0));
    };
    window.addEventListener('suneung:quests-updated', sync);
    window.addEventListener('suneung:stats-updated', sync);
    return () => {
      window.removeEventListener('suneung:quests-updated', sync);
      window.removeEventListener('suneung:stats-updated', sync);
    };
  }, [today]);

  const date = activeQuestId ? sessionDate : today;
  const quests = useMemo(() => getDailyQuests(date, date === today && reviewAvailable), [date, reviewAvailable, today]);
  const activeQuest = quests.find((quest) => quest.id === activeQuestId);
  const targetSeconds = (activeQuest?.minutes || 0) * 60;
  const remaining = Math.max(0, targetSeconds - elapsed);
  const progress = targetSeconds ? Math.min(100, (elapsed / targetSeconds) * 100) : 0;
  const record = date === today ? questDay : readQuestDay(date);
  const coreCompleted = CORE_QUEST_IDS.filter((id) => record.completed[id]).length;
  const todaysBonus = Object.keys(record.completed).length * 5 + record.dailyBonus;

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setElapsed((value) => Math.min(targetSeconds, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, targetSeconds]);

  function finishQuest(finalElapsed = elapsed) {
    if (saved.current || !activeQuest || finalElapsed < 1) return;
    saved.current = true;
    const minutes = Math.max(1, Math.round(finalElapsed / 60));
    const calendar = readCalendarData();
    const log = {
      id: globalThis.crypto?.randomUUID?.() || `quest-${Date.now()}`,
      date: sessionDate,
      subjectId: activeQuest.subjectId,
      subjectName: activeQuest.subjectName,
      minutes,
      amount: '',
      unit: '분',
      activity: activeQuest.activity,
      label: '일일 퀘스트',
    };
    const logSaved = writeCalendarData({ ...calendar, logs: [...calendar.logs, log] });
    if (finalElapsed >= targetSeconds && logSaved) {
      const completed = completeQuest(sessionDate, activeQuest.id, CORE_QUEST_IDS);
      if (completed) {
        if (sessionDate === today) setQuestDay(completed);
        const cleared = CORE_QUEST_IDS.every((id) => Boolean(completed.completed[id]));
        setMessage(`${activeQuest.title} 완료! +5 XP${cleared && completed.dailyBonus ? ' · 오늘의 퀘스트 보너스 +10 XP' : ''}`);
      } else setMessage(`${minutes}분 공부 기록을 저장했어요. 완료 보너스는 저장하지 못했어요.`);
    } else {
      setMessage(`${minutes}분을 공부 기록에 저장했어요. 목표 시간에 도달하면 퀘스트 XP도 받아요.`);
    }
    setRunning(false);
    setActiveQuestId('');
    setSessionDate('');
    setElapsed(0);
  }

  function finishWordQuest(finalSession) {
    const calendar = readCalendarData();
    const log = { id: globalThis.crypto?.randomUUID?.() || `quest-words-${Date.now()}`, date: finalSession.date, subjectId: 'english', subjectName: '영어', minutes: Math.max(1, Math.round(finalSession.seconds / 60)), amount: String(finalSession.count), unit: '단어', activity: `수능 영단어 ${finalSession.count}개 복습`, label: '일일 퀘스트' };
    if (writeCalendarData({ ...calendar, logs: [...calendar.logs, log] })) {
      const completed = completeQuest(finalSession.date, 'english-words', CORE_QUEST_IDS);
      if (completed && finalSession.date === today) setQuestDay(completed);
      setMessage(`영단어 ${finalSession.count}개 학습 완료! +5 XP`);
    } else setMessage('공부 기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.');
    setWordSession(null); setWordCards([]); setWordIndex(0); setWordRevealed(false); setActiveQuestId(''); setSessionDate(''); setRunning(false);
  }

  function rateQuestWord(rating) {
    const card = wordCards[wordIndex];
    if (!card || !wordSession) return;
    if (rating === 'learned') markQuestWordLearned('english', card.id);
    else rateWordCard('english', card.id, 'again');
    const nextSession = { ...wordSession, count: wordSession.count + 1 };
    const nextIndex = wordIndex + 1;
    if (nextIndex >= wordCards.length) finishWordQuest(nextSession);
    else { setWordSession(nextSession); setWordIndex(nextIndex); setWordRevealed(false); }
  }

  function startWordQuest(quest) {
    if (activeQuestId || questDay.completed[quest.id]) return;
    const deck = getDailyWordCards('english', today, 80);
    if (!deck.length) { setMessage('영어 단어장이 비어 있어요. 영어 공부방에서 단어 PDF·엑셀을 먼저 추가해 주세요.'); return; }
    saved.current = false;
    setWordCards(deck); setWordIndex(0); setWordRevealed(false); setWordSession({ date: today, count: 0, seconds: 0 });
    setSessionDate(today); setElapsed(0); setActiveQuestId(quest.id); setRunning(true);
    setMessage(`오늘 복습할 단어 ${deck.length}개를 무작위로 골랐어요.`);
  }

  useEffect(() => {
    if (!wordSession || !running) return undefined;
    const timer = window.setInterval(() => setWordSession((current) => current ? { ...current, seconds: current.seconds + 1 } : current), 1000);
    return () => window.clearInterval(timer);
  }, [Boolean(wordSession), running]);

  useEffect(() => {
    if (activeQuest && elapsed >= targetSeconds && targetSeconds > 0) finishQuest(targetSeconds);
  }, [activeQuest, elapsed, targetSeconds]);

  function startQuest(quest) {
    if (activeQuestId || questDay.completed[quest.id]) return;
    saved.current = false;
    setSessionDate(today);
    setElapsed(0);
    setActiveQuestId(quest.id);
    setRunning(true);
    setMessage(`${quest.title} 퀘스트 진행 중`);
  }

  function cancelSession() {
    if (wordSession) { setWordSession(null); setWordCards([]); setWordIndex(0); setWordRevealed(false); }
    setRunning(false);
    setActiveQuestId('');
    setSessionDate('');
    setElapsed(0);
    setMessage('타이머를 취소했어요. 기록과 XP는 차감되지 않아요.');
  }

  return <section className="daily-quests" aria-label="오늘의 일일 퀘스트">
    <header className="daily-quests-header"><div className="daily-quests-intro"><span className="daily-quests-mark"><Award size={18} /></span><div><span className="eyebrow">TODAY'S QUESTS</span><h2>오늘의 일일 퀘스트</h2><p>{message}</p></div></div><div className="daily-quests-progress"><strong>{coreCompleted}<small>/3</small></strong><span>완료</span></div></header>
    <div className="daily-quest-list">{quests.map((quest) => {
      const completed = Boolean(questDay.completed[quest.id]);
      const isActive = activeQuestId === quest.id;
      const waiting = Boolean(activeQuestId && !isActive);
      return <article key={quest.id} className={`daily-quest ${completed ? 'completed' : ''} ${isActive ? 'in-progress' : ''}`}>
        <div className="daily-quest-icon">{completed ? <Check size={17} /> : quest.icon}</div>
        <div className="daily-quest-info"><div className="daily-quest-title-row"><strong>{quest.title}</strong><span className="daily-quest-xp">{completed ? '완료 +5 XP' : '+5 XP'}</span></div><div className="daily-quest-meta"><span>{quest.subjectName}</span><span>·</span><span>{quest.cue}</span><span>·</span><span>{quest.wordQuest ? '무작위 미암기 단어' : <><Clock3 size={11} /> {quest.minutes}분</>}</span></div>
          {isActive && !quest.wordQuest && <div className="daily-quest-timer"><strong role="timer" aria-live="off">{formatTime(remaining)}</strong><div className="quick-session-progress" role="progressbar" aria-label="퀘스트 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div><div className="daily-quest-controls"><button className="button button-secondary" onClick={() => setRunning((value) => !value)}>{running ? <><Pause size={13} /> 잠깐 멈춤</> : <><Play size={13} /> 계속하기</>}</button><button className="button button-primary" onClick={() => finishQuest()} disabled={elapsed < 1}>중간 기록</button><button className="quick-abandon" onClick={cancelSession} aria-label="타이머 취소"><RotateCcw size={13} /></button></div></div>}
          {isActive && quest.wordQuest && wordSession && wordCards[wordIndex] && <div className="daily-word-session"><div className="daily-word-progress"><span>{wordIndex + 1} / {wordCards.length} · 오늘 외운 {wordSession.count}개 · {formatTime(wordSession.seconds)}</span><div className="quick-session-progress"><span style={{ width: `${(wordIndex / wordCards.length) * 100}%` }} /></div></div><strong className="daily-word-front">{wordCards[wordIndex].word}</strong>{wordRevealed ? <><p className="daily-word-meaning">{wordCards[wordIndex].meaning}</p><div className="daily-word-actions"><button onClick={() => rateQuestWord('again')}>기억안남</button><button onClick={() => rateQuestWord('learned')}>외움</button></div></> : <button className="button button-primary" onClick={() => setWordRevealed(true)}>뜻 확인</button>}<div className="daily-word-controls"><button className="button button-secondary" onClick={() => setRunning((value) => !value)}>{running ? <><Pause size={13} /> 잠깐 멈춤</> : <><Play size={13} /> 계속하기</>}</button><button className="daily-word-stop" onClick={cancelSession}><RotateCcw size={12} /> 그만하기</button></div></div>}
        </div>
        {!isActive && <button className={`daily-quest-action ${completed ? 'is-complete' : ''}`} onClick={() => quest.wordQuest ? startWordQuest(quest) : startQuest(quest)} disabled={completed || waiting} aria-label={completed ? `${quest.title} 완료` : `${quest.title} 시작`}>{completed ? <><Check size={15} /> 완료</> : waiting ? '진행 대기' : <><Play size={14} fill="currentColor" /> 시작</>}</button>}
      </article>;
    })}</div>
    <footer className="daily-quests-footer"><span><Zap size={13} /> 공부 1분 = 1 XP · 퀘스트 완료 +5 XP</span><strong>{coreCompleted === 3 ? '기본 퀘스트 3개 완료 · +10 XP 보너스 수령' : `오늘 퀘스트 보너스 +${todaysBonus} XP`}</strong><small>못 한 날에도 감점은 없어요. 영어 → 국어 → 오늘의 집중 과목 순으로 작게 시작해요.</small></footer>
  </section>;
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, Check, Clock3, Moon, Sun, Target, Zap } from 'lucide-react';
import { CSAT_DATE, SUBJECTS } from './csat.js';

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111318' : '#f5f6f8');
    try { localStorage.setItem('suneung-theme', theme); } catch { /* storage may be disabled */ }
  }, [theme]);
  return [theme, () => setTheme((current) => current === 'dark' ? 'light' : 'dark')];
}

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, new Date(target).getTime() - now);
  return { days: Math.floor(left / 86_400_000), hours: Math.floor((left / 3_600_000) % 24), minutes: Math.floor((left / 60_000) % 60), seconds: Math.floor((left / 1000) % 60), passed: left === 0 };
}

function formatClock(seconds) {
  const safe = Math.max(0, seconds);
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60]
    .map((part) => String(part).padStart(2, '0')).join(':');
}

function ExamTimer({ subject }) {
  const [remaining, setRemaining] = useState(subject.minutes * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setRemaining(subject.minutes * 60);
    setRunning(false);
  }, [subject]);
  useEffect(() => {
    if (!running || remaining <= 0) return undefined;
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, remaining]);
  const progress = 1 - remaining / (subject.minutes * 60);
  return (
    <section className="timer-card" aria-label={`${subject.name} 실전 타이머`}>
      <div className="timer-top"><div><span className="eyebrow">실전 타이머</span><h2>{subject.name} 시간 관리</h2></div><span className="timer-chip"><Clock3 size={14} /> {subject.minutes}분</span></div>
      <div className="timer-readout" role="timer" aria-live="off">{formatClock(remaining)}</div>
      <div className="progress-track" role="progressbar" aria-label="사용한 시험 시간" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
      <div className="timer-actions"><span className="timer-hint">{remaining === 0 ? '시험 시간이 종료됐어요' : running ? '집중해서 풀어보세요' : '준비가 되면 시작하세요'}</span><button className="button button-primary timer-button" onClick={() => remaining > 0 && setRunning(!running)}>{running ? '일시정지' : remaining === 0 ? '종료' : '시작'} <ArrowRight size={16} /></button></div>
    </section>
  );
}

function App() {
  const [theme, toggleTheme] = useTheme();
  const [selected, setSelected] = useState(SUBJECTS[0]);
  const dday = useCountdown(CSAT_DATE);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()), []);

  return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#home" aria-label="수능 루틴 홈"><span className="brand-mark"><BookOpenCheck size={19} /></span><span>수능<span className="brand-light">루틴</span></span></a><div className="topbar-right"><span className="today-label">{dateLabel}</span><button className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'} title={theme === 'dark' ? '라이트 모드' : '다크 모드'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span></button><div className="avatar" aria-label="학생 프로필">수</div></div></header>
      <div className="page-content" id="home">
        <section className="welcome-row"><div><div className="eyebrow welcome-kicker"><span className="live-dot" /> 오늘도 한 문제씩</div><h1>다시 풀면, <span>실력이 됩니다.</span></h1><p className="welcome-copy">약점을 발견하고, 내 것으로 만드는 수능 루틴</p></div><div className="streak"><span className="streak-icon">✦</span><div><strong>오늘의 루틴</strong><small>꾸준함이 점수를 만듭니다</small></div></div></section>
        <section className="hero-grid">
          <article className="dday-card"><div className="dday-orb orb-one" /><div className="dday-orb orb-two" /><div className="dday-content"><div className="dday-label"><Target size={15} /> 2027학년도 대학수학능력시험</div><div className="dday-line"><strong>{dday.passed ? 'D-Day' : `D-${dday.days}`}</strong><span>목표까지</span></div><div className="dday-clock" aria-label={`남은 시간 ${dday.days}일 ${dday.hours}시간 ${dday.minutes}분 ${dday.seconds}초`}><div><b>{String(dday.days).padStart(3, '0')}</b><small>일</small></div><i>:</i><div><b>{String(dday.hours).padStart(2, '0')}</b><small>시간</small></div><i>:</i><div><b>{String(dday.minutes).padStart(2, '0')}</b><small>분</small></div><i>:</i><div><b>{String(dday.seconds).padStart(2, '0')}</b><small>초</small></div></div><p className="exam-date">2026년 11월 19일 목요일 · 오전 8:40 시작</p></div><div className="hero-stamp"><Zap size={16} fill="currentColor" /> D-DAY</div></article>
          <article className="quote-card"><div className="quote-mark">“</div><p>한 번의 정답보다<br /><strong>한 번의 깨달음</strong>이<br />점수를 바꿉니다.</p><span>오늘의 공부 원칙</span><div className="quote-lines"><i /><i /><i /></div></article>
        </section>
        <section className="section-heading"><div><span className="eyebrow">YOUR STUDY, YOUR PACE</span><h2>오늘 연습할 과목</h2></div><span className="section-note"><span className="live-dot" /> 과목을 선택하면 시험 시간이 설정돼요</span></section>
        <section className="subject-grid" aria-label="과목 선택">{SUBJECTS.map((subject) => <button key={subject.id} className={`subject-card ${selected.id === subject.id ? 'is-selected' : ''}`} onClick={() => setSelected(subject)} aria-pressed={selected.id === subject.id}><span className={`subject-icon ${subject.color}`}>{subject.icon}</span><span className="subject-info"><strong>{subject.name}</strong><small>{subject.detail}</small></span><span className="subject-time">{subject.minutes}<small>분</small></span>{selected.id === subject.id && <span className="selected-check"><Check size={12} /></span>}</button>)}</section>
        <div className="bottom-grid"><ExamTimer subject={selected} /><aside className="focus-card"><div className="focus-head"><span className="focus-icon"><Zap size={17} /></span><span className="eyebrow">TODAY'S FOCUS</span></div><h3>한 문제를 풀어도<br />이유까지 기록하기</h3><p>틀린 이유를 아는 순간,<br />다음 점수가 달라집니다.</p><div className="focus-footer"><span>다음 단계</span><span>오답 노트 준비 중 <ArrowRight size={14} /></span></div></aside></div>
        <footer className="footer"><span>© 2026 수능루틴</span><span>작은 복습이 쌓여 큰 실력이 됩니다.</span></footer>
      </div>
    </main>
  );
}

export default App;

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, BarChart3, BookOpenCheck, CalendarDays, Moon, Play, Sun, Target, Zap } from 'lucide-react';
import { CSAT_DATE, SUBJECTS } from './csat.js';
import ExamSession from './ExamSession.jsx';
import { getAnalytics } from './studyStorage.js';
import { getPdfExam } from './pdfStorage.js';
import QuickStart from './QuickStart.jsx';
import GrowthCard from './GrowthCard.jsx';
import InstallPrompt from './InstallPrompt.jsx';
const DataBackup = lazy(() => import('./DataBackup.jsx'));
const PdfImport = lazy(() => import('./PdfImport.jsx'));
const PdfExam = lazy(() => import('./PdfExam.jsx'));
const DueReviews = lazy(() => import('./DueReviews.jsx'));
const SubjectHub = lazy(() => import('./SubjectHub.jsx'));
const StudyCalendar = lazy(() => import('./StudyCalendar.jsx'));

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

function HomeNavigation({ active, onSelect, onCalendar }) {
  const items = [
    { id: 'today', icon: <Play size={19} />, title: '오늘 루틴', note: '집중 타이머' },
    { id: 'practice', icon: <BookOpenCheck size={19} />, title: '실전·자료', note: '과목 · PDF · 문제' },
    { id: 'progress', icon: <BarChart3 size={19} />, title: '점수·복습', note: '기록 · 오답' },
    { id: 'calendar', icon: <CalendarDays size={19} />, title: '달력·계획', note: '일정 · 공부량' },
    { id: 'growth', icon: <Award size={19} />, title: '내 성장기록', note: '레벨 · 랭크 · 배지' },
  ];
  return <nav className="home-menu-grid has-growth" aria-label="주요 메뉴">{items.map((item) => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => item.id === 'calendar' ? onCalendar() : onSelect(item.id)} aria-pressed={item.id === 'calendar' ? undefined : active === item.id}><span className="home-menu-icon">{item.icon}</span><span className="home-menu-copy"><strong>{item.title}</strong><small>{item.note}</small></span><ArrowRight className="home-menu-arrow" size={15} /></button>)}</nav>;
}

function App() {
  const [theme, toggleTheme] = useTheme();
  const [selected, setSelected] = useState(SUBJECTS[0]);
  const [examActive, setExamActive] = useState(false);
  const [pdfImportActive, setPdfImportActive] = useState(false);
  const [hubActive, setHubActive] = useState(false);
  const [examReturnToHub, setExamReturnToHub] = useState(false);
  const [calendarActive, setCalendarActive] = useState(false);
  const [homeTab, setHomeTab] = useState('today');
  const [pdfExam, setPdfExam] = useState(null);
  const [pdfReadOnly, setPdfReadOnly] = useState(false);
  const [pdfReturnToHub, setPdfReturnToHub] = useState(false);
  const [importNotice, setImportNotice] = useState('');
  const [analytics, setAnalytics] = useState(getAnalytics);
  const dday = useCountdown(CSAT_DATE);
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()), []);

  useEffect(() => { window.scrollTo(0, 0); }, [homeTab, hubActive, examActive, calendarActive, pdfImportActive, pdfExam]);

  useEffect(() => {
    const refreshAnalytics = () => setAnalytics(getAnalytics());
    window.addEventListener('suneung:stats-updated', refreshAnalytics);
    window.addEventListener('suneung:calendar-updated', refreshAnalytics);
    window.addEventListener('suneung:quests-updated', refreshAnalytics);
    window.addEventListener('suneung:clears-updated', refreshAnalytics);
    window.addEventListener('storage', refreshAnalytics);
    return () => {
      window.removeEventListener('suneung:stats-updated', refreshAnalytics);
      window.removeEventListener('suneung:calendar-updated', refreshAnalytics);
      window.removeEventListener('suneung:quests-updated', refreshAnalytics);
      window.removeEventListener('suneung:clears-updated', refreshAnalytics);
      window.removeEventListener('storage', refreshAnalytics);
    };
  }, []);

  if (pdfExam) return <Suspense fallback={<main className="pdf-exam-shell"><p>PDF 자료를 여는 중…</p></main>}><PdfExam exam={pdfExam} viewOnly={pdfReadOnly} onExit={() => { setPdfExam(null); setPdfReadOnly(false); if (pdfReturnToHub) setHubActive(true); setPdfReturnToHub(false); }} /></Suspense>;
  if (calendarActive) return <Suspense fallback={<main className="calendar-shell"><p>달력을 여는 중…</p></main>}><StudyCalendar onExit={() => setCalendarActive(false)} /></Suspense>;
  if (pdfImportActive) return <Suspense fallback={<main className="import-shell"><p>PDF 도구를 불러오는 중…</p></main>}><PdfImport initialSubject={selected} onExit={() => { setPdfImportActive(false); if (pdfReturnToHub) setHubActive(true); setPdfReturnToHub(false); }} onSaved={(exam) => { setSelected(SUBJECTS.find((subject) => subject.id === exam.subjectId) || SUBJECTS[0]); setPdfImportActive(false); setPdfReturnToHub(false); setHubActive(true); }} onStart={(exam) => { setSelected(SUBJECTS.find((subject) => subject.id === exam.subjectId) || SUBJECTS[0]); setPdfImportActive(false); setPdfReadOnly(false); setPdfExam(exam); }} /></Suspense>;
  if (hubActive) return <Suspense fallback={<main className="hub-shell"><p>과목 공부방을 여는 중…</p></main>}><SubjectHub subject={selected} onExit={() => setHubActive(false)} onStartPractice={(subject) => { setSelected(subject); setHubActive(false); setExamReturnToHub(true); setExamActive(true); }} onUploadExam={(subject) => { setSelected(subject); setPdfReturnToHub(true); setHubActive(false); setPdfImportActive(true); }} onOpenExam={(exam) => { setPdfReturnToHub(true); setPdfReadOnly(false); setPdfExam(exam); }} onOpenConcept={(resource) => { setPdfReturnToHub(true); setPdfReadOnly(true); setPdfExam(resource); }} /></Suspense>;
  if (examActive) return <ExamSession subject={selected} onExit={() => { setExamActive(false); if (examReturnToHub) setHubActive(true); setExamReturnToHub(false); }} />;

  return (
    <main className="app-shell">
      <header className="topbar"><a className="brand" href="#home" aria-label="수능 루틴 홈" onClick={() => setHomeTab('today')}><span className="brand-mark"><BookOpenCheck size={19} /></span><span>수능<span className="brand-light">루틴</span></span></a><div className="topbar-right"><span className="today-label">{dateLabel}</span><button className="theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'} title={theme === 'dark' ? '라이트 모드' : '다크 모드'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span></button><div className="avatar" aria-label="학생 프로필">수</div></div></header>
      <div className="page-content" id="home">
        {importNotice && <div className="import-notice" role="status">{importNotice}<button onClick={() => setImportNotice('')} aria-label="알림 닫기">×</button></div>}
        {homeTab === 'today' && <>
        <section className="welcome-row"><div><div className="eyebrow welcome-kicker"><span className="live-dot" /> 오늘도 한 문제씩</div><h1>다시 풀면, <span>실력이 됩니다.</span></h1><p className="welcome-copy">약점을 발견하고, 내 것으로 만드는 수능 루틴</p></div><div className="streak"><span className="streak-icon">✦</span><div><strong>오늘의 루틴</strong><small>꾸준함이 점수를 만듭니다</small></div></div></section>
        <section className="hero-grid home-hero-grid">
          <article className="dday-card"><div className="dday-orb orb-one" /><div className="dday-orb orb-two" /><div className="dday-content"><div className="dday-label"><Target size={15} /> 2027학년도 대학수학능력시험</div><div className="dday-line"><strong>{dday.passed ? 'D-Day' : `D-${dday.days}`}</strong><span>목표까지</span></div><div className="dday-clock" aria-label={`남은 시간 ${dday.days}일 ${dday.hours}시간 ${dday.minutes}분 ${dday.seconds}초`}><div><b>{String(dday.days).padStart(3, '0')}</b><small>일</small></div><i>:</i><div><b>{String(dday.hours).padStart(2, '0')}</b><small>시간</small></div><i>:</i><div><b>{String(dday.minutes).padStart(2, '0')}</b><small>분</small></div><i>:</i><div><b>{String(dday.seconds).padStart(2, '0')}</b><small>초</small></div></div><p className="exam-date">2026년 11월 19일 목요일 · 오전 8:40 시작</p></div><div className="hero-stamp"><Zap size={16} fill="currentColor" /> D-DAY</div></article>
          <article className="quote-card"><div className="quote-mark">“</div><p>한 번의 정답보다<br /><strong>한 번의 깨달음</strong>이<br />점수를 바꿉니다.</p><span>오늘의 공부 원칙</span><div className="quote-lines"><i /><i /><i /></div></article>
        </section>
        <QuickStart />
        <HomeNavigation active={homeTab} onSelect={setHomeTab} onCalendar={() => setCalendarActive(true)} />
        <InstallPrompt />
        </>}
        {homeTab !== 'today' && <header className="view-page-header"><button type="button" onClick={() => setHomeTab('today')} aria-label="홈으로 돌아가기"><ArrowLeft size={18} /><span>홈으로</span></button><div><span className="eyebrow">수능 루틴</span><h1>{({ practice: '실전·자료', progress: '점수·복습', growth: '내 성장기록' })[homeTab]}</h1></div></header>}
        {homeTab === 'practice' && <section className="home-view"><section className="section-heading"><div><span className="eyebrow">YOUR STUDY, YOUR PACE</span><h2>과목 공부방 선택</h2><p className="hub-section-note">과목을 고르면 해당 과목의 실전, 시험지와 개념 자료를 볼 수 있어요.</p></div></section><section className="subject-grid" aria-label="과목 공부방">{SUBJECTS.map((subject) => <button key={subject.id} aria-label={`${subject.name} 공부방으로 이동`} className={`subject-card ${selected.id === subject.id ? 'is-selected' : ''}`} onClick={() => { setSelected(subject); setHubActive(true); }}><span className={`subject-icon ${subject.color}`}>{subject.icon}</span><span className="subject-info"><strong>{subject.name}</strong><small>실전 · 문제 · 개념 자료</small></span><span className="subject-time" aria-hidden="true"><ArrowRight size={18} /></span></button>)}</section></section>}
        {homeTab === 'progress' && <section className="home-view progress-view"><section className="analytics-card"><div className="analytics-header"><div><span className="eyebrow">MY STUDY DATA</span><h2>점수와 공부량</h2></div><span className="local-save-label">이 기기에 저장</span></div><div className="analytics-metrics"><div className="analytics-metric"><span>실전 풀이</span><strong>{analytics.attempts}<i>회</i></strong></div><div className="analytics-metric"><span>누적 정답률</span><strong>{analytics.accuracy}<i>%</i></strong></div><div className="analytics-metric"><span>기록한 공부</span><strong>{Math.floor(analytics.studyMinutes / 60)}<i>시간</i> {analytics.studyMinutes % 60}<i>분</i></strong></div><div className="analytics-metric weak-metric"><span>먼저 복습할 과목</span><strong>{analytics.weakSubject?.name || '기록 없음'}<i>{analytics.weakSubject ? `${Math.round((analytics.weakSubject.correct / analytics.weakSubject.total) * 100)}%` : ''}</i></strong></div></div>{analytics.recentScores.length > 0 && <div className="score-trend"><span>최근 정답률</span><div className="trend-bars" role="img" aria-label={`최근 풀이 정답률 ${analytics.recentScores.join(', ')}퍼센트`}>{analytics.recentScores.map((score, index) => <span key={`${index}-${score}`} title={`${score}%`}><i style={{ height: `${Math.max(8, score)}%` }} /></span>)}</div></div>}{analytics.studyBySubject.length > 0 && <div className="analytics-breakdown"><h3>과목별 기록 시간</h3>{analytics.studyBySubject.map((row) => <div key={row.id}><span>{row.name}</span><strong>{row.minutes >= 60 ? `${Math.floor(row.minutes / 60)}시간 ${row.minutes % 60}분` : `${row.minutes}분`}</strong></div>)}</div>}{analytics.mistakeReasons.length > 0 && <div className="analytics-breakdown"><h3>자주 틀린 이유</h3>{analytics.mistakeReasons.slice(0, 3).map((row) => <div key={row.reason}><span>{row.reason}</span><strong>{row.count}회</strong></div>)}</div>}</section><Suspense fallback={null}><DueReviews onOpenPdf={async (id) => { try { const exam = await getPdfExam(id); if (exam) setPdfExam(exam); } catch { /* the PDF library can be reopened from the home screen */ } }} /><DataBackup /></Suspense></section>}
        {homeTab === 'growth' && <section className="home-view growth-view"><GrowthCard studyMinutes={analytics.studyMinutes} questBonusXp={analytics.questBonusXp} clearBonusXp={analytics.clearBonusXp} achievementStats={analytics.achievementStats} /></section>}
        <footer className="footer"><span>© 2026 수능루틴</span><span>작은 복습이 쌓여 큰 실력이 됩니다.</span></footer>
      </div>
    </main>
  );
}

export default App;

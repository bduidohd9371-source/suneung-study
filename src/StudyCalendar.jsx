import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Plus, Trash2 } from 'lucide-react';
import { SUBJECTS } from './csat.js';
import { readAttempts } from './studyStorage.js';
import { readCalendarData, writeCalendarData } from './calendarStorage.js';

const pad = (value) => String(value).padStart(2, '0');
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const makeId = () => globalThis.crypto?.randomUUID?.() || `calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const STARTER = [
  { id: 'read', subject: '독서', task: '독서 지문 한 개 풀기' },
  { id: 'literature', subject: '문학', task: '문학 세트 한 개 풀기' },
  { id: 'hwajag', subject: '화작', task: '화작 세트 한 개 풀기' },
];

function localDate(value) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); }

export default function StudyCalendar({ onExit }) {
  const [data, setData] = useState(readCalendarData);
  const [month, setMonth] = useState(() => { const today = new Date(); return new Date(today.getFullYear(), today.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [tab, setTab] = useState('calendar');
  const [logForm, setLogForm] = useState({ subjectId: 'korean', activity: '', minutes: '', amount: '', unit: '문항' });
  const [eventForm, setEventForm] = useState({ title: '', time: '', type: '논술' });
  const [planForm, setPlanForm] = useState('');
  const [diagForm, setDiagForm] = useState(null);
  const [notice, setNotice] = useState('');

  function updateData(patch) {
    setData((previous) => { const next = { ...previous, ...patch }; writeCalendarData(next); return next; });
  }

  const attempts = useMemo(() => readAttempts(), [data]);
  const calendarEntries = useMemo(() => {
    const sessions = attempts.map((attempt) => ({ id: `attempt-${attempt.id}`, date: dateKey(new Date(attempt.createdAt)), subjectId: attempt.subjectId, subjectName: attempt.subjectName, minutes: Math.max(0, Math.round((attempt.durationSeconds || 0) / 60)), amount: `${attempt.correct}/${attempt.total}`, unit: '정답', activity: '실전 풀이', label: '실전 풀이' }));
    return [...sessions, ...data.logs];
  }, [attempts, data.logs]);

  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > count ? null : dateKey(new Date(month.getFullYear(), month.getMonth(), day));
    });
    return cells;
  }, [month]);

  const dayLogs = calendarEntries.filter((entry) => entry.date === selectedDate);
  const dayEvents = data.events.filter((event) => event.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const dayPlans = data.plans.filter((plan) => plan.date === selectedDate);
  const selected = localDate(selectedDate);
  const selectedWeek = weekKey(selected);
  const weeklyGoal = data.weekGoals[selectedWeek] || '';

  function weekKey(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
    return dateKey(copy);
  }

  function addLog(event) {
    event.preventDefault();
    const subject = SUBJECTS.find((item) => item.id === logForm.subjectId);
    const minutes = Number(logForm.minutes);
    if (!subject || !logForm.activity.trim() || !minutes) { setNotice('공부 내용과 공부 시간을 입력해 주세요.'); return; }
    updateData({ logs: [...data.logs, { id: makeId(), date: selectedDate, subjectId: subject.id, subjectName: subject.name, minutes, activity: logForm.activity.trim(), amount: logForm.amount.trim(), unit: logForm.unit, label: '직접 기록' }] });
    setLogForm((current) => ({ ...current, activity: '', minutes: '', amount: '' })); setNotice('공부 기록을 달력에 저장했어요.');
  }

  function addEvent(event) {
    event.preventDefault();
    if (!eventForm.title.trim()) { setNotice('일정 이름을 입력해 주세요.'); return; }
    updateData({ events: [...data.events, { id: makeId(), date: selectedDate, ...eventForm, title: eventForm.title.trim() }] });
    setEventForm({ title: '', time: '', type: '논술' }); setNotice('일정을 저장했어요.');
  }

  function addPlan(event) {
    event.preventDefault();
    if (!planForm.trim()) return;
    updateData({ plans: [...data.plans, { id: makeId(), date: selectedDate, text: planForm.trim(), done: false }] });
    setPlanForm('');
  }

  function addSuggestedPlans() {
    const existing = new Set(dayPlans.map((plan) => plan.text));
    const suggestions = [
      '기상 후 영어 단어 10분',
      '첫 공부로 국어 독서 지문 25분',
      ...(weeklyGoal.trim() ? ['이번 주 목표 20분 진행'] : []),
    ].filter((text) => !existing.has(text));
    if (!suggestions.length) { setNotice('추천 루틴이 이미 이 날짜에 있어요. 하나만 골라 시작해도 충분해요.'); return; }
    updateData({ plans: [...data.plans, ...suggestions.map((text) => ({ id: makeId(), date: selectedDate, text, done: false }))] });
    setNotice('작게 시작하는 루틴을 추가했어요. 다 하지 못해도 다음 날 다시 조정하면 돼요.');
  }

  function removeItem(key, id) { updateData({ [key]: data[key].filter((item) => item.id !== id) }); }
  function togglePlan(id) { updateData({ plans: data.plans.map((plan) => plan.id === id ? { ...plan, done: !plan.done } : plan) }); }
  function saveSleep(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateData({ sleep: { ...data.sleep, [selectedDate]: { sleep: form.get('sleep'), wake: form.get('wake') } } });
    setNotice('생활 리듬을 기록했어요.');
  }

  function saveDiagnostic(event) {
    event.preventDefault();
    if (!diagForm || !diagForm.minutes) return;
    const previousDiagnostic = data.diagnostics[diagForm.id];
    const diagnostic = { ...previousDiagnostic, date: selectedDate, minutes: Number(diagForm.minutes), correct: Number(diagForm.correct || 0), total: Number(diagForm.total || 0), done: true, logId: previousDiagnostic?.logId || makeId() };
    const log = { id: diagnostic.logId, date: selectedDate, subjectId: 'korean', subjectName: '국어', minutes: diagnostic.minutes, activity: `${diagForm.subject} 진단`, amount: diagnostic.total ? `${diagnostic.correct}/${diagnostic.total}` : '', unit: '정답', label: '국어 진단' };
    const logs = previousDiagnostic?.logId ? data.logs.map((item) => item.id === diagnostic.logId ? log : item) : [...data.logs, log];
    updateData({ diagnostics: { ...data.diagnostics, [diagForm.id]: diagnostic }, logs });
    setDiagForm(null); setNotice(`${diagForm.subject} 공부 시간을 국어 진단 기록에 저장했어요.`);
  }

  return <main className="calendar-shell"><header className="calendar-header"><button className="icon-button" onClick={onExit} aria-label="홈으로 돌아가기"><ArrowLeft size={18} /></button><div><span className="eyebrow">STUDY CALENDAR</span><h1>공부 달력과 계획</h1></div><CalendarDays size={20} /></header>
    <nav className="calendar-tabs"><button className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}>달력</button><button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>첫 주 진단 계획</button></nav>
    {tab === 'calendar' ? <div className="calendar-layout"><section className="calendar-main"><div className="month-toolbar"><button className="icon-button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} aria-label="지난달"><ArrowLeft size={16} /></button><h2>{month.getFullYear()}년 {month.getMonth() + 1}월</h2><button className="icon-button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} aria-label="다음 달"><ArrowRight size={16} /></button></div><div className="calendar-grid"><div className="calendar-weekdays">{['월', '화', '수', '목', '금', '토', '일'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-days">{monthDays.map((date, index) => {
      if (!date) return <span key={`blank-${index}`} className="calendar-blank" />;
      const entries = calendarEntries.filter((entry) => entry.date === date);
      const events = data.events.filter((event) => event.date === date);
      const plans = data.plans.filter((plan) => plan.date === date);
      const subjectTotals = Object.values(entries.reduce((map, entry) => {
        const key = entry.subjectId || entry.subjectName;
        const row = map[key] || { name: entry.subjectName, minutes: 0 };
        row.minutes += Number(entry.minutes) || 0;
        map[key] = row;
        return map;
      }, {}));
      const isToday = date === dateKey(new Date());
      return <button key={date} className={`calendar-day ${date === selectedDate ? 'selected' : ''} ${isToday ? 'today' : ''}`} onClick={() => setSelectedDate(date)}><b>{Number(date.slice(-2))}</b>{subjectTotals.slice(0, 2).map((item) => <small className="calendar-subject-time" key={item.name}>{({ 국어: '국', 수학: '수', 영어: '영', 윤리: '윤', 사회: '사' })[item.name] || item.name?.slice(0, 1)} {item.minutes}분</small>)}{subjectTotals.length > 2 && <small className="calendar-extra-subjects">+{subjectTotals.length - 2}과목</small>}{events.length > 0 && <i className="calendar-event-dot" title={events.map((event) => event.title).join(', ')} />}{plans.length > 0 && <i className="calendar-plan-dot" title="계획 있음" />}</button>;
    })}</div></div><p className="calendar-legend"><span><i className="calendar-event-dot" /> 일정</span><span><i className="calendar-plan-dot" /> 계획</span><span>풀이 기록 시간은 자동 반영 · 다른 공부는 직접 기록</span></p>
      <section className="week-goal-card"><div><span className="eyebrow">WEEK OF {selectedWeek}</span><h3>이번 주 끝낼 것</h3></div><textarea value={weeklyGoal} onChange={(event) => updateData({ weekGoals: { ...data.weekGoals, [selectedWeek]: event.target.value } })} rows={2} placeholder="예: 논술 초안 1개 완성, 독서 지문 5개 복습" /><small>선택한 날짜가 속한 주의 목표예요. 달력에서 다른 주를 골라 그 주 계획도 적을 수 있어요.</small></section>
      </section>
      <aside className="calendar-day-detail"><div className="calendar-selected-date"><span className="eyebrow">SELECTED DAY</span><h2>{selected.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</h2></div>
        <section className="day-section"><h3>공부 기록</h3>{dayLogs.length ? dayLogs.map((log) => <div className="day-log-row" key={log.id}><span><b>{log.subjectName}</b><small>{log.activity || log.label}{log.amount ? ` · ${log.amount}${log.unit === '정답' ? ' 정답' : log.unit}` : ''}</small></span><strong>{log.minutes}분</strong>{log.label !== '실전 풀이' && <button onClick={() => removeItem('logs', log.id)} aria-label="공부 기록 삭제"><Trash2 size={13} /></button>}</div>) : <p className="calendar-muted">아직 기록이 없어요.</p>}
          <form className="calendar-form" onSubmit={addLog}><select value={logForm.subjectId} onChange={(event) => setLogForm({ ...logForm, subjectId: event.target.value })}>{SUBJECTS.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select><input value={logForm.activity} onChange={(event) => setLogForm({ ...logForm, activity: event.target.value })} placeholder="공부 내용" /><div className="calendar-form-inline"><input type="number" min="1" max="1440" value={logForm.minutes} onChange={(event) => setLogForm({ ...logForm, minutes: event.target.value })} placeholder="분" /><input value={logForm.amount} onChange={(event) => setLogForm({ ...logForm, amount: event.target.value })} placeholder="양(선택)" /><select value={logForm.unit} onChange={(event) => setLogForm({ ...logForm, unit: event.target.value })}>{['문항', '쪽', '단어', '세트'].map((unit) => <option key={unit}>{unit}</option>)}</select><button aria-label="공부 기록 추가"><Plus size={15} /></button></div><small>시간은 필수, 공부한 양은 선택이에요.</small></form>
        </section>
        <section className="day-section"><h3>일정</h3>{dayEvents.map((event) => <div className="day-event-row" key={event.id}><span>{event.time && <b>{event.time} · </b>}{event.type} · {event.title}</span><button onClick={() => removeItem('events', event.id)} aria-label="일정 삭제"><Trash2 size={13} /></button></div>)}<form className="calendar-form" onSubmit={addEvent}><div className="calendar-form-inline"><select value={eventForm.type} onChange={(event) => setEventForm({ ...eventForm, type: event.target.value })}>{['논술', '학원', '개인 일정', '마감'].map((type) => <option key={type}>{type}</option>)}</select><input type="time" value={eventForm.time} onChange={(event) => setEventForm({ ...eventForm, time: event.target.value })} /></div><div className="calendar-form-inline"><input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} placeholder="일정 이름" /><button aria-label="일정 추가"><Plus size={15} /></button></div></form></section>
        <section className="day-section"><div className="day-section-title-row"><h3>오늘 할 일</h3><button type="button" className="plan-suggestion-button" onClick={addSuggestedPlans}>작은 계획 추천</button></div>{dayPlans.map((plan) => <div className="day-plan-row" key={plan.id}><label><input type="checkbox" checked={plan.done} onChange={() => togglePlan(plan.id)} /><span className={plan.done ? 'done' : ''}>{plan.text}</span></label><button onClick={() => removeItem('plans', plan.id)} aria-label="할 일 삭제"><Trash2 size={13} /></button></div>)}<p className="routine-hint">추천 루틴은 상담에서 정한 기상 후 영어 10분과 스카 첫 공부 국어 25분을 바탕으로 해요. 주간 목표가 있으면 20분 진행도 제안해요.</p><form className="calendar-form calendar-form-inline" onSubmit={addPlan}><input value={planForm} onChange={(event) => setPlanForm(event.target.value)} placeholder="예: 국어 독서 지문 1개" /><button aria-label="오늘 할 일 추가"><Plus size={15} /></button></form></section>
        <section className="day-section"><h3>생활 리듬 <small>선택 · 기상 목표는 7시부터 천천히</small></h3><form key={selectedDate} className="calendar-form calendar-form-inline" onSubmit={saveSleep}><label>잠든 시간<input name="sleep" type="time" defaultValue={data.sleep[selectedDate]?.sleep || ''} /></label><label>기상 시간<input name="wake" type="time" defaultValue={data.sleep[selectedDate]?.wake || ''} /></label><button className="sleep-save-button"><Check size={14} /></button></form><p className="routine-hint">기상 직후 영어 단어 10분, 스카 첫 공부는 국어로 시작하는 루틴을 기록해 둬요.</p></section>
        {notice && <p className="calendar-notice" role="status">{notice}</p>}
      </aside>
    </div> : <DiagnosticPlan data={data} onRecord={(task, form) => setDiagForm({ ...task, ...form })} setSelectedDate={setSelectedDate} />}
    {diagForm && <div className="calendar-modal-backdrop" onClick={() => setDiagForm(null)}><form className="diagnostic-modal" onSubmit={saveDiagnostic} onClick={(event) => event.stopPropagation()}><button type="button" className="calendar-modal-close" onClick={() => setDiagForm(null)}>×</button><span className="eyebrow">KOREAN CHECK-IN</span><h2>{diagForm.subject} 진단 기록</h2><label>푼 날짜<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label><label>공부 시간(분)<input type="number" name="minutes" min="1" value={diagForm.minutes || ''} onChange={(event) => setDiagForm({ ...diagForm, minutes: event.target.value })} placeholder="예: 25" required /></label><div className="calendar-form-inline"><label>맞힌 개수<input type="number" name="correct" min="0" value={diagForm.correct || ''} onChange={(event) => setDiagForm({ ...diagForm, correct: event.target.value })} /></label><label>푼 문항 수<input type="number" name="total" min="0" value={diagForm.total || ''} onChange={(event) => setDiagForm({ ...diagForm, total: event.target.value })} /></label></div><button className="button button-primary" type="submit"><Check size={15} /> 진단 결과 저장</button></form></div>}
    <footer className="footer"><button className="button button-secondary" onClick={onExit}><ArrowLeft size={14} /> 홈으로</button><span>기록은 이 기기에 저장돼요.</span></footer>
  </main>;
}

function DiagnosticPlan({ data, onRecord, setSelectedDate }) {
  return <section className="diagnostic-plan"><div className="diagnostic-intro"><span className="eyebrow">START SMALL · KOREAN DIAGNOSTIC</span><h2>국어 독서·문학·화작을 한 번씩 풀어봐요</h2><p>영역별 실력을 미리 맞히려 하지 않아도 돼요. 각 한 세트의 시간과 정답 수를 기록하면 시작점을 함께 볼 수 있어요. 하루에 하나씩 해도 괜찮아요.</p></div><div className="diagnostic-routine"><div><span className="eyebrow">작은 시작 루틴</span><strong>기상 직후 영어 단어 10분 → 스카 첫 공부는 국어</strong><small>생활 리듬은 먼저 7시 기상을 향해 조정하고, 익숙해지면 6시 30분으로 당겨요. 잠드는 시간도 함께 기록해요.</small></div></div><div className="diagnostic-cards">{STARTER.map((task) => { const result = data.diagnostics[task.id]; return <article className="diagnostic-task" key={task.id}><div><span className="eyebrow">국어 · {task.subject}</span><h3>{task.task}</h3></div>{result?.done ? <div className="diagnostic-result"><Check size={16} /><strong>{result.date} · {result.minutes}분</strong>{result.total ? <span>{result.correct}/{result.total} 정답</span> : null}<button className="button button-secondary" onClick={() => { setSelectedDate(result.date); onRecord(task, result); }}>기록 수정</button></div> : <button className="button button-primary" onClick={() => onRecord(task, { minutes: '', correct: '', total: '' })}><Clock3 size={14} /> 풀고 결과 기록</button>}</article>; })}</div><p className="diagnostic-note">이건 등급을 매기는 시험이 아니라 다음 공부를 정하기 위한 가벼운 점검이에요. 한 번에 다 하지 않아도 됩니다.</p></section>;
}

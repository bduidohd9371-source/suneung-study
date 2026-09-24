import { useEffect, useState } from 'react';
import { Check, Circle, LockKeyhole, Sparkles } from 'lucide-react';
import { getClearStats, getExamIdentity, readClearedExams } from './clearStorage.js';

const TYPES = [
  { id: 'june', label: '6월 모평' },
  { id: 'september', label: '9월 모평' },
  { id: 'suneung', label: '수능' },
];

export default function ExamClearBoard({ subject, exams = [], onOpen }) {
  const [clears, setClears] = useState(readClearedExams);
  useEffect(() => {
    const refresh = () => setClears(readClearedExams());
    window.addEventListener('suneung:clears-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('suneung:clears-updated', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);
  const stats = getClearStats(subject.id);
  const examFor = (year, type) => exams.find((exam) => { const identity = getExamIdentity(exam); return identity?.year === year && identity?.type === type; });

  return <section className="clear-board"><header className="clear-board-header"><div><span className="eyebrow">CSAT CLEAR BOARD</span><h2>기출 도장 깨기</h2><p>시험지를 풀고 채점하면 자동으로 클리어돼요.</p></div><span className="clear-board-total"><Sparkles size={14} /> {stats.count}개 CLEAR</span></header>
    <div className="clear-board-years">{years.map((year) => <section className="clear-board-year" key={year}><h3>{year}년</h3><div>{TYPES.map(({ id, label }) => {
      const key = `${subject.id}_${year}_${id}`;
      const record = clears[key];
      const exam = examFor(year, id);
      return <button key={id} className={`clear-board-cell ${record ? 'cleared' : ''} ${exam && !record ? 'available' : ''}`} disabled={!record && !exam} onClick={() => exam && !record && onOpen(exam)} aria-label={`${year}년 ${label} ${record ? '클리어' : exam ? '풀기' : '시험지 미등록'}`}>
        <span className="clear-board-mark">{record ? <Check size={17} /> : exam ? <Circle size={15} /> : <LockKeyhole size={13} />}</span><strong>{label}</strong><small>{record ? 'CLEAR' : exam ? '풀기' : '미등록'}</small>
      </button>;
    })}</div></section>)}</div>
  </section>;
}

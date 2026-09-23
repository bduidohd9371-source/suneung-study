import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpenCheck, FileText, Layers3, ListChecks, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { deletePdfExam, listPdfExams, savePdfExam } from './pdfStorage.js';
import VocabStudio from './VocabStudio.jsx';

const MODES = [
  { id: 'problem', icon: ListChecks, title: '문제 풀이', text: '모의 문제와 PDF 시험지·OMR로 실전 연습' },
  { id: 'concept', icon: NotebookPen, title: '개념 복습', text: '개념 노트를 PDF로 열고 읽으며 필기' },
  { id: 'vocab', icon: BookOpenCheck, title: '단어 암기', text: '단어 자료에서 단어장을 만들고 반복 복습' },
];

export default function SubjectHub({ subject, onExit, onStartPractice, onUploadExam, onOpenExam, onOpenConcept }) {
  const [mode, setMode] = useState('');
  const [concepts, setConcepts] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function refreshConcepts() {
    try { setConcepts(await listPdfExams({ subjectId: subject.id, kind: 'concept' })); }
    catch { setError('개념 자료 목록을 읽지 못했어요.'); }
  }
  useEffect(() => { refreshConcepts(); }, [subject.id]);

  async function addConcept(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setError('PDF 파일을 선택해 주세요.'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('PDF는 50MB 이하 파일을 선택해 주세요.'); return; }
    setSaving(true); setError('');
    const resource = { id: globalThis.crypto?.randomUUID?.() || `concept-${Date.now()}`, kind: 'concept', subjectId: subject.id, subjectName: subject.name, name: file.name, blob: file, createdAt: new Date().toISOString() };
    try { await savePdfExam(resource); await refreshConcepts(); }
    catch { setError('개념 PDF를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
    finally { setSaving(false); }
  }

  async function removeConcept(resource) {
    if (!window.confirm(`${resource.name} 자료를 삭제할까요?`)) return;
    try { await deletePdfExam(resource.id); await refreshConcepts(); }
    catch { setError('개념 자료를 삭제하지 못했어요.'); }
  }

  if (mode === 'vocab') return <VocabStudio subject={subject} onBack={() => setMode('')} />;

  return <main className="hub-shell"><header className="hub-header"><button className="icon-button" onClick={mode ? () => setMode('') : onExit} aria-label="뒤로"><ArrowLeft size={18} /></button><div><span className="eyebrow">SUBJECT STUDY SPACE</span><h1>{subject.name} 공부방</h1></div><span className={`subject-icon ${subject.color}`}>{subject.icon}</span></header>
    {!mode ? <><p className="hub-intro">공부할 자료와 오늘의 목적에 맞는 방식을 골라요.</p><section className="hub-mode-grid">{MODES.map(({ id, icon: Icon, title, text }) => <button className="hub-mode-card" key={id} onClick={() => setMode(id)}><span><Icon size={19} /></span><strong>{title}</strong><small>{text}</small></button>)}</section></> : mode === 'problem' ? <>
      <section className="hub-section-head"><div><span className="eyebrow">PROBLEM SOLVING</span><h2>문제 풀이</h2></div></section><button className="button button-primary hub-action" onClick={() => onStartPractice(subject)}><ListChecks size={16} /> 기본 제공 문제 풀이</button><button className="button button-secondary hub-action" onClick={() => onUploadExam(subject)}><Plus size={16} /> PDF 시험지 추가 · OMR</button>
      <section className="hub-resource-list"><h3>저장된 시험지</h3><ExamList subjectId={subject.id} onOpen={onOpenExam} />{error && <p className="import-error">{error}</p>}</section>
    </> : <>
      <section className="hub-section-head"><div><span className="eyebrow">CONCEPT NOTES</span><h2>개념 자료</h2></div><label className={`file-pick ${saving ? 'disabled' : ''}`}><input type="file" accept="application/pdf,.pdf" disabled={saving} onChange={addConcept} /><Plus size={15} /> {saving ? '저장 중…' : 'PDF 추가'}</label></section><p className="hub-helper">수학 미적분, 생활과 윤리, 사회문화 등 과목과 관계없이 개념 PDF를 추가할 수 있어요. 자료를 열어 S펜으로 읽고 필기하세요.</p>{error && <p className="import-error">{error}</p>}
      <section className="hub-resource-list">{concepts.length ? concepts.map((resource) => <article className="hub-resource-row" key={resource.id}><button onClick={() => onOpenConcept(resource)}><FileText size={17} /><span><strong>{resource.name}</strong><small>{new Date(resource.createdAt).toLocaleDateString('ko-KR')}</small></span></button><button className="saved-pdf-delete" aria-label={`${resource.name} 삭제`} onClick={() => removeConcept(resource)}><Trash2 size={14} /></button></article>) : <div className="hub-empty"><Layers3 size={23} /><p>아직 올린 개념 PDF가 없어요.</p></div>}</section>
    </>}
  </main>;
}

function ExamList({ subjectId, onOpen }) {
  const [exams, setExams] = useState([]);
  useEffect(() => { let live = true; listPdfExams({ subjectId, kind: 'exam' }).then((items) => { if (live) setExams(items); }).catch(() => {}); return () => { live = false; }; }, [subjectId]);
  return exams.length ? exams.map((exam) => <article className="hub-resource-row" key={exam.id}><button onClick={() => onOpen(exam)}><FileText size={17} /><span><strong>{exam.name}</strong><small>{exam.total}문항 · {new Date(exam.createdAt).toLocaleDateString('ko-KR')}</small></span></button><span className="hub-resource-arrow">열기</span></article>) : <div className="hub-empty"><FileText size={22} /><p>저장된 PDF 시험지가 없어요.</p></div>;
}

import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpenCheck, FileText, Layers3, ListChecks, Plus, Trash2 } from 'lucide-react';
import { deletePdfExam, getPdfExamDraft, listPdfExams, savePdfExam } from './pdfStorage.js';
import { getPracticeDraft } from './studyStorage.js';
import QuestionBank from './QuestionBank.jsx';
import VocabStudio from './VocabStudio.jsx';

export default function SubjectHub({ subject, onExit, onStartPractice, onUploadExam, onOpenExam, onOpenConcept }) {
  const [vocabOpen, setVocabOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
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

  if (vocabOpen) return <VocabStudio subject={subject} onBack={() => setVocabOpen(false)} />;
  if (bankOpen) return <QuestionBank initialSubject={subject} onExit={() => setBankOpen(false)} onStart={onStartPractice} />;
  const practiceDraft = getPracticeDraft(subject.id);

  return <main className="hub-shell"><header className="hub-header"><button className="icon-button" onClick={onExit} aria-label="과목 목록으로"><ArrowLeft size={18} /></button><div><span className="eyebrow">SUBJECT STUDY SPACE</span><h1>{subject.name} 공부방</h1></div><span className={`subject-icon ${subject.color}`}>{subject.icon}</span></header>
    <p className="hub-intro">{subject.name} 실전 풀이, 기출 PDF, 개념 복습 자료를 한곳에서 관리해요.</p>
    <section className="hub-dashboard-top"><div className="hub-start-panel"><span className="eyebrow">실전 연습</span><h2>{subject.name} 기본 제공 문항</h2><p>앱에 포함된 짧은 연습 문항이에요. 기출 PDF는 아래 문제 목록에서 원본 그대로 열 수 있어요.</p><div className="hub-practice-actions"><button className="button button-primary" onClick={() => onStartPractice(subject)}><ListChecks size={15} /> {practiceDraft ? practiceDraft.submitted ? '오답 기록 이어서 쓰기' : `연습 이어하기 · ${Object.keys(practiceDraft.answers || {}).length}개 답 저장` : `기본 제공 연습 시작 · ${subject.minutes}분`}</button><button className="button button-secondary" onClick={() => setBankOpen(true)}>기본 문항 목록</button></div></div></section>

    <section className="hub-resource-section"><div className="hub-section-head"><div><span className="eyebrow">QUESTION LIBRARY</span><h2>문제 목록</h2><p className="hub-section-note">올린 기출·모의고사 PDF를 선택해 원본 그대로 풀어요.</p></div><button className="button button-secondary" onClick={() => onUploadExam(subject)}><Plus size={14} /> 시험지 추가</button></div><ExamList subjectId={subject.id} onOpen={onOpenExam} /></section>

    <section className="hub-resource-section"><div className="hub-section-head"><div><span className="eyebrow">CONCEPT NOTES</span><h2>개념 복습</h2><p className="hub-section-note">개념 노트 PDF를 열어 읽고 화면에 필기해요.</p></div><div className="hub-resource-actions">{['english', 'korean'].includes(subject.id) && <button className="button button-secondary" onClick={() => setVocabOpen(true)}><BookOpenCheck size={14} /> {subject.id === 'korean' ? '고전 어휘 단어장' : '영어 단어장'}</button>}<label className={`file-pick ${saving ? 'disabled' : ''}`}><input type="file" accept="application/pdf,.pdf" disabled={saving} onChange={addConcept} /><Plus size={15} /> {saving ? '저장 중…' : '개념 PDF 추가'}</label></div></div>{error && <p className="import-error" role="alert">{error}</p>}<section className="hub-resource-list">{concepts.length ? concepts.map((resource) => <article className="hub-resource-row" key={resource.id}><button onClick={() => onOpenConcept(resource)}><FileText size={17} /><span><strong>{resource.name}</strong><small>{new Date(resource.createdAt).toLocaleDateString('ko-KR')}</small></span></button><button className="saved-pdf-delete" aria-label={`${resource.name} 삭제`} onClick={() => removeConcept(resource)}><Trash2 size={14} /></button></article>) : <div className="hub-empty"><Layers3 size={23} /><p>아직 올린 개념 PDF가 없어요.</p></div>}</section></section>
    <footer className="hub-footer-note">자료는 이 기기에 저장돼요.</footer>
  </main>;
}

function ExamList({ subjectId, onOpen }) {
  const [exams, setExams] = useState([]);
  useEffect(() => { let live = true; listPdfExams({ subjectId, kind: 'exam' }).then(async (items) => { const prepared = await Promise.all(items.map(async (exam) => ({ ...exam, draft: await getPdfExamDraft(exam.id) }))); if (live) setExams(prepared); }).catch(() => {}); return () => { live = false; }; }, [subjectId]);
  return exams.length ? <div className="hub-resource-list">{exams.map((exam) => <article className="hub-resource-row" key={exam.id}><button onClick={() => onOpen(exam)}><FileText size={17} /><span><strong>{exam.name}</strong><small>{exam.draft ? `이전 풀이 이어하기 · ${Object.keys(exam.draft.answers || {}).length}/${exam.total}개 답 저장` : `${exam.total}문항 · ${new Date(exam.createdAt).toLocaleDateString('ko-KR')}`}</small></span></button><span className="hub-resource-arrow">{exam.draft ? '이어 풀기' : '열기'}</span></article>)}</div> : <div className="hub-empty"><FileText size={22} /><p>저장된 시험지가 없어요. PDF 시험지와 정답표를 추가해 보세요.</p></div>;
}

import { useEffect, useState } from 'react';
import { ArrowLeft, FileUp, Play, Trash2 } from 'lucide-react';
import { SUBJECTS } from './csat.js';
import { deletePdfExam, listPdfExams, savePdfExam } from './pdfStorage.js';

const CIRCLED = ['①', '②', '③', '④', '⑤'];

function parseAnswerKey(value, total) {
  const explicit = [...value.matchAll(/(?:문항\s*)?(\d{1,3})\s*(?:번|[:.)．-])\s*([1-5①②③④⑤])/g)];
  if (explicit.length) {
    const answers = {};
    for (const [, number, mark] of explicit) answers[Number(number)] = CIRCLED.includes(mark) ? CIRCLED.indexOf(mark) + 1 : Number(mark);
    return Object.keys(answers).length === total && Array.from({ length: total }, (_, i) => answers[i + 1]).every(Boolean) ? answers : null;
  }
  let values = [...value.matchAll(/[①②③④⑤]/g)].map(([mark]) => CIRCLED.indexOf(mark) + 1);
  if (!values.length && /^[\s,;|/\d-]+$/.test(value)) values = value.match(/[1-5]/g)?.map(Number) || [];
  return values.length === total ? Object.fromEntries(values.map((answer, index) => [index + 1, answer])) : null;
}

export default function PdfImport({ onExit, onStart, initialSubject = SUBJECTS[0] }) {
  const [subjectId, setSubjectId] = useState(initialSubject.id);
  const selectedSubject = SUBJECTS.find((subject) => subject.id === subjectId) || SUBJECTS[0];
  const [file, setFile] = useState(null);
  const [total, setTotal] = useState(Number(initialSubject.detail.match(/\d+문항/)?.[0]?.replace('문항', '')) || 45);
  const [keyText, setKeyText] = useState('');
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try { setExams(await listPdfExams({ subjectId, kind: 'exam' })); } catch { setError('저장된 PDF 목록을 읽지 못했어요.'); }
  }
  useEffect(() => { refresh(); }, [subjectId]);
  function changeSubject(id) {
    setSubjectId(id);
    const subject = SUBJECTS.find((item) => item.id === id);
    setTotal(Number(subject?.detail.match(/\d+문항/)?.[0]?.replace('문항', '')) || 20);
  }

  async function saveAndStart(event) {
    event.preventDefault();
    const key = parseAnswerKey(keyText, total);
    if (!file || !key) { setError(`PDF와 정답 ${total}개가 필요해요. 정답 칸에는 1~5 숫자 ${total}개를 순서대로 붙여 쓰면 됩니다.`); return; }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setError('PDF 파일을 선택해 주세요.'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('PDF는 50MB 이하 파일을 선택해 주세요.'); return; }
    setSaving(true); setError('');
    const exam = { id: globalThis.crypto?.randomUUID?.() || `pdf-${Date.now()}`, kind: 'exam', subjectId, subjectName: selectedSubject.name, minutes: selectedSubject.minutes, name: file.name, total, answerKey: key, blob: file, createdAt: new Date().toISOString() };
    try { await savePdfExam(exam); onStart(exam); }
    catch { setError('PDF를 이 브라우저에 저장하지 못했어요. 저장 공간을 확인해 주세요.'); }
    finally { setSaving(false); }
  }

  async function removeExam(exam) {
    if (!window.confirm(`“${exam.name}” 시험지를 삭제할까요?`)) return;
    try { await deletePdfExam(exam.id); await refresh(); }
    catch { setError('PDF를 삭제하지 못했어요.'); }
  }

  async function resumeExam(exam) {
    try { const saved = await (await import('./pdfStorage.js')).getPdfExam(exam.id); if (saved) onStart(saved); }
    catch { setError('저장한 PDF를 열지 못했어요.'); }
  }

  return <main className="import-shell pdf-library-shell">
    <header className="import-header"><button className="icon-button" onClick={onExit} aria-label="홈으로"><ArrowLeft size={18} /></button><div><span className="eyebrow">PDF EXAM · OMR</span><h1>PDF 시험지와 OMR</h1></div></header>
    <section className="import-intro"><span className="import-icon"><FileUp size={19} /></span><div><strong>원본 PDF 그대로 풀어요.</strong><p>문제 텍스트를 추출하지 않고 시험지를 표시합니다. OMR에서 답을 입력하고 정답표와 자동 채점해요. PDF와 답안은 이 브라우저에만 저장됩니다.</p></div></section>
    <form className="pdf-setup-form" onSubmit={saveAndStart}>
      <div className="pdf-setup-grid"><label className="import-subject">과목<select value={subjectId} onChange={(event) => changeSubject(event.target.value)}>{SUBJECTS.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label className="pdf-total-field">문항 수<input type="number" min="1" max="100" value={total} onChange={(event) => setTotal(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} /></label><label className="file-pick"><input type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(''); }} /><FileUp size={16} /> PDF 선택</label></div>
      {file && <p className="selected-file">선택한 시험지: {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB</p>}
      <label className="pdf-answer-key">정답 입력 <span>정답 번호만 1~5 숫자로, 문항 순서대로 붙여 쓰세요</span><textarea inputMode="numeric" value={keyText} onChange={(event) => setKeyText(event.target.value)} rows={2} placeholder={`예: ${'12345'.repeat(Math.ceil(total / 5)).slice(0, total)}`} /></label>
      <p className="pdf-key-help">{keyText.replace(/\D/g, '').length}/{total}개 입력 · 예를 들어 정답이 ④, ②, ⑤이면 <strong>425</strong>처럼 입력해요. 공백이나 줄바꿈 없이 입력해도 됩니다.</p>
      {error && <p className="import-error" role="alert">{error}</p>}
      <button className="button button-primary pdf-start-button" disabled={saving || !file}><Play size={15} /> {saving ? '저장 중…' : '저장하고 OMR 풀이 시작'}</button>
    </form>
    <section className="saved-pdf-list"><div className="draft-list-heading"><div><span className="eyebrow">SAVED ON THIS DEVICE</span><h2>저장된 시험지</h2></div></div>{exams.length ? exams.map((exam) => <article className="saved-pdf-item" key={exam.id}><button className="saved-pdf-open" onClick={() => resumeExam(exam)}><strong>{exam.name}</strong><span>{exam.subjectName} · {exam.total}문항 · {new Date(exam.createdAt).toLocaleDateString('ko-KR')}</span></button><button className="saved-pdf-delete" aria-label={`${exam.name} 삭제`} onClick={() => removeExam(exam)}><Trash2 size={15} /></button></article>) : <p className="analytics-empty">아직 저장된 PDF가 없어요.</p>}</section>
  </main>;
}

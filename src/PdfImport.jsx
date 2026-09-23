import { useState } from 'react';
import { ArrowLeft, Check, FileUp, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { SUBJECTS } from './csat.js';
import { saveImportedQuestions } from './studyStorage.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 100;
const OPTION_MARKERS = ['①', '②', '③', '④', '⑤'];

async function extractPdfText(file) {
  if (file.size > MAX_BYTES) throw new Error('PDF는 20MB 이하 파일만 가져올 수 있어요.');
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  const pdf = await loadingTask.promise;
  try {
    if (pdf.numPages > MAX_PAGES) throw new Error(`현재 ${MAX_PAGES}페이지 이하 PDF를 지원해요.`);
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows = new Map();
      content.items.forEach((item) => {
        if (!('str' in item) || !item.str.trim()) return;
        const y = Math.round(item.transform?.[5] ?? 0);
        const x = item.transform?.[4] ?? 0;
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push({ x, text: item.str });
      });
      pages.push([...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').trim()).filter(Boolean).join('\n'));
      page.cleanup();
    }
    return pages.join('\n');
  } finally {
    await pdf.destroy();
  }
}

function parseQuestionDrafts(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const start = /^(?:문항\s*)?(0?\d{1,2})\s*[.)．、:：]\s*(.*)$/;
  const blocks = [];
  let current = null;
  lines.forEach((line) => {
    const match = line.match(start);
    if (match && Number(match[1]) > 0 && Number(match[1]) <= 60) {
      if (current) blocks.push(current);
      current = { number: Number(match[1]), text: match[2] };
    } else if (current) {
      current.text += `${current.text ? '\n' : ''}${line}`;
    }
  });
  if (current) blocks.push(current);

  return blocks.slice(0, 60).map((block, index) => {
    const markers = [...block.text.matchAll(/[①②③④⑤]/g)];
    const options = Array(5).fill('');
    let prompt = block.text;
    if (markers.length) {
      prompt = block.text.slice(0, markers[0].index).trim();
      markers.forEach((marker, markerIndex) => {
        const optionIndex = OPTION_MARKERS.indexOf(marker[0]);
        const from = marker.index + marker[0].length;
        const to = markers[markerIndex + 1]?.index ?? block.text.length;
        options[optionIndex] = block.text.slice(from, to).replace(/\s+/g, ' ').trim();
      });
    }
    return { id: `pdf-${Date.now()}-${index}`, originalNumber: block.number, prompt, options, correctAnswer: null };
  }).filter((question) => question.prompt || question.options.some(Boolean));
}

function emptyQuestion(index) {
  return { id: `manual-${Date.now()}-${index}`, originalNumber: index + 1, prompt: '', options: Array(5).fill(''), correctAnswer: null };
}

export default function PdfImport({ onExit, onImported }) {
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [fileName, setFileName] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [showText, setShowText] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    setLoading(true);
    setDrafts([]);
    setRawText('');
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) throw new Error('선택 가능한 텍스트가 없어요. 스캔 이미지 PDF는 현재 가져올 수 없습니다.');
      setRawText(text);
      const parsed = parseQuestionDrafts(text);
      if (parsed.length) setDrafts(parsed);
      else {
        setDrafts([{ ...emptyQuestion(0), prompt: text.slice(0, 4000) }]);
        setError('문항 번호를 자동으로 나누지 못해 PDF 텍스트를 한 문항으로 넣었어요. 문제와 선택지를 직접 나눠 수정해 주세요.');
      }
    } catch (caught) {
      setError(caught?.message || 'PDF를 읽지 못했어요. 파일을 확인해 주세요.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  function updateDraft(id, patch) {
    setDrafts((previous) => previous.map((draft) => draft.id === id ? { ...draft, ...patch } : draft));
  }

  function updateOption(draft, optionIndex, value) {
    const options = [...draft.options];
    options[optionIndex] = value;
    updateDraft(draft.id, { options });
  }

  const canImport = drafts.length > 0 && drafts.every((draft) => draft.prompt.trim() && draft.options.every((option) => option.trim()) && draft.correctAnswer >= 1 && draft.correctAnswer <= 5);

  function importQuestions() {
    if (!canImport) return;
    const success = saveImportedQuestions(subjectId, drafts.map(({ id, prompt, options, correctAnswer }) => ({ id, prompt: prompt.trim(), options: options.map((option) => option.trim()), correctAnswer })));
    if (!success) {
      setError('기기에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');
      return;
    }
    onImported(drafts.length, SUBJECTS.find((subject) => subject.id === subjectId));
  }

  return (
    <main className="import-shell">
      <header className="import-header"><button className="icon-button" onClick={onExit} aria-label="홈으로"><ArrowLeft size={18} /></button><div><span className="eyebrow">PHASE 4 · PDF IMPORT</span><h1>PDF에서 문제 가져오기</h1></div></header>
      <section className="import-intro"><span className="import-icon"><FileUp size={19} /></span><div><strong>PDF는 이 브라우저 안에서 처리돼요.</strong><p>텍스트형 PDF의 문항과 ①~⑤ 선택지를 읽어옵니다. 스캔 이미지·손글씨 PDF는 아직 지원하지 않아요.</p></div></section>
      <section className="import-controls"><label className="import-subject">과목<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{SUBJECTS.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label className={`file-pick ${loading ? 'disabled' : ''}`}><input type="file" accept="application/pdf,.pdf" onChange={handleFile} disabled={loading} /><FileUp size={16} /> {loading ? 'PDF 읽는 중…' : 'PDF 선택'} </label></section>
      {fileName && <p className="selected-file">선택한 파일: {fileName}</p>}
      {loading && <div className="import-loading"><LoaderCircle size={18} className="spin-icon" /> 문항을 찾고 있어요.</div>}
      {error && <p className="import-error" role="alert">{error}</p>}
      {rawText && !loading && <button className="raw-text-toggle" onClick={() => setShowText((value) => !value)}>{showText ? 'PDF 원문 숨기기' : '추출된 원문 보기'}</button>}
      {showText && <pre className="raw-text-preview">{rawText.slice(0, 12000)}</pre>}
      {drafts.length > 0 && <section className="draft-list"><div className="draft-list-heading"><div><span className="eyebrow">REVIEW BEFORE IMPORT</span><h2>가져올 문항 확인</h2><p>정답은 PDF에서 자동 추측하지 않아요. 선택지와 정답을 검토해 주세요.</p></div><button className="button button-secondary add-question-button" onClick={() => setDrafts((previous) => [...previous, emptyQuestion(previous.length)])}><Plus size={14} /> 직접 추가</button></div>{drafts.map((draft, draftIndex) => <article className="draft-card" key={draft.id}><div className="draft-title"><strong>문항 {draftIndex + 1}</strong><span>PDF 원문 번호 {draft.originalNumber}</span><button aria-label={`${draftIndex + 1}번 문항 삭제`} onClick={() => setDrafts((previous) => previous.filter((question) => question.id !== draft.id))}><Trash2 size={14} /></button></div><label className="draft-prompt-label">문제 내용<textarea rows={3} value={draft.prompt} onChange={(event) => updateDraft(draft.id, { prompt: event.target.value })} placeholder="문제 지문을 입력하세요" /></label><div className="draft-options"><span className="draft-field-title">선택지</span>{draft.options.map((option, optionIndex) => <label className="draft-option" key={optionIndex}><span>{optionIndex + 1}</span><input value={option} onChange={(event) => updateOption(draft, optionIndex, event.target.value)} placeholder={`${optionIndex + 1}번 선택지`} /></label>)}</div><fieldset className="correct-answer-field"><legend>정답 선택</legend><div>{OPTION_MARKERS.map((marker, index) => <button type="button" key={marker} className={draft.correctAnswer === index + 1 ? 'selected' : ''} onClick={() => updateDraft(draft.id, { correctAnswer: index + 1 })} aria-pressed={draft.correctAnswer === index + 1}>{marker}</button>)}</div></fieldset></article>)}</section>}
      <footer className="import-footer"><span>{drafts.length ? `${drafts.length}문항 후보 · 모든 항목을 확인해 주세요` : 'PDF를 선택하면 가져온 문제를 직접 검토할 수 있어요.'}</span><button className="button button-primary" onClick={importQuestions} disabled={!canImport}><Check size={15} /> {drafts.length ? '과목 문제 목록에 추가' : '문항을 먼저 가져오세요'}</button></footer>
    </main>
  );
}

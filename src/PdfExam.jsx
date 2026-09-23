import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Eraser, FileText, Grid3X3, Pencil, Sun } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getPageMarks, getPdfExam, savePageMarks } from './pdfStorage.js';
import { saveAttempt, updateAttempt } from './studyStorage.js';
import PdfReview from './PdfReview.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const clockText = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;

export default function PdfExam({ exam, onExit, onOpenBank, viewOnly = false }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(exam.minutes * 60);
  const [omrOpen, setOmrOpen] = useState(false);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [clearerText, setClearerText] = useState(false);
  const [pageMarks, setPageMarks] = useState([]);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0, ratio: 1 });
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attemptId] = useState(() => globalThis.crypto?.randomUUID?.() || `attempt-${Date.now()}`);
  const [reviewData, setReviewData] = useState({ topic: '', notes: {} });
  const [loadError, setLoadError] = useState('');
  const canvasRef = useRef(null);
  const inkCanvasRef = useRef(null);
  const frameRef = useRef(null);
  const marksRef = useRef([]);
  const drawingRef = useRef(false);
  const pixelRatioRef = useRef(1);
  const [frameWidth, setFrameWidth] = useState(0);

  useEffect(() => {
    if (!frameRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    let loadingTask;
    getPdfExam(exam.id).then(async (stored) => {
      if (!stored?.blob || !stored.blob.size) throw new Error('이 기기에 저장된 PDF 데이터가 비어 있어요. PDF를 다시 등록해 주세요.');
      const data = new Uint8Array(await stored.blob.arrayBuffer());
      loadingTask = pdfjsLib.getDocument({ data, isEvalSupported: false });
      return loadingTask.promise;
    }).then((document) => { if (active) { setPdf(document); setPageCount(document.numPages); } })
      .catch((error) => { if (active) setLoadError(error.message || 'PDF를 열지 못했어요.'); });
    return () => { active = false; loadingTask?.destroy(); };
  }, [exam.id]);

  const drawPage = useCallback(async () => {
    if (!pdf || !canvasRef.current || !frameWidth) return;
    const documentPage = await pdf.getPage(page);
    const base = documentPage.getViewport({ scale: 1 });
    const scale = Math.min((frameWidth - 20) / base.width, 2.5);
    const viewport = documentPage.getViewport({ scale });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    pixelRatioRef.current = pixelRatio;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false });
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    await documentPage.render({ canvasContext: context, viewport, transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0] }).promise;
    setPageSize({ width: viewport.width, height: viewport.height, ratio: pixelRatio });
    documentPage.cleanup();
  }, [pdf, page, frameWidth]);

  useEffect(() => { drawPage(); }, [drawPage]);
  useEffect(() => {
    let active = true;
    marksRef.current = [];
    setPageMarks([]);
    getPageMarks(exam.id, page).then((record) => { if (active) { marksRef.current = record?.strokes || []; setPageMarks(record?.strokes || []); } }).catch(() => {});
    return () => { active = false; };
  }, [exam.id, page]);
  useEffect(() => {
    const canvas = inkCanvasRef.current;
    if (!canvas || !pageSize.width || !pageSize.height) return;
    const { width, height, ratio } = pageSize;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    for (const stroke of pageMarks) {
      if (!stroke.points.length) continue;
      context.beginPath();
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width * width;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x * width, point.y * height));
      context.stroke();
    }
  }, [pageSize, pageMarks]);

  function pointFromEvent(event) {
    const rect = inkCanvasRef.current.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }
  function beginInk(event) {
    if (!drawEnabled) return;
    event.preventDefault();
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = [...marksRef.current, { color: '#d33f49', width: event.pointerType === 'pen' ? 0.0021 : 0.0032, points: [pointFromEvent(event)] }];
    marksRef.current = next;
    setPageMarks(next);
  }
  function moveInk(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const next = [...marksRef.current];
    const last = next[next.length - 1];
    last.points.push(pointFromEvent(event));
    marksRef.current = next;
    setPageMarks(next);
  }
  async function endInk() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try { await savePageMarks(exam.id, page, marksRef.current); } catch { setLoadError('필기를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
  }
  async function clearPageMarks() {
    marksRef.current = [];
    setPageMarks([]);
    try { await savePageMarks(exam.id, page, []); } catch { setLoadError('필기를 지우지 못했어요.'); }
  }
  useEffect(() => {
    if (viewOnly) return undefined;
    if (submitted || remaining <= 0) { if (!submitted && remaining <= 0) setSubmitted(true); return undefined; }
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remaining, submitted, viewOnly]);

  const submit = useCallback(() => setSubmitted(true), []);
  useEffect(() => {
    if (!submitted || saved) return;
    const correct = Object.entries(exam.answerKey).filter(([number, answer]) => answers[number] === answer).length;
    const wrongReviews = Array.from({ length: exam.total }, (_, index) => index + 1).filter((number) => answers[number] !== exam.answerKey[number]).map((number) => ({ questionId: `pdf:${exam.id}:${number}`, questionNumber: number, myAnswer: answers[number] || null, correctAnswer: exam.answerKey[number] }));
    const ok = saveAttempt({ id: attemptId, createdAt: new Date().toISOString(), subjectId: exam.subjectId, subjectName: exam.subjectName, total: exam.total, correct, durationSeconds: exam.minutes * 60 - remaining, answers, source: exam.name, sourceExamId: exam.id, topic: '', wrongReviews });
    if (ok) setSaved(true);
  }, [submitted, saved, answers, exam, remaining, attemptId]);
  useEffect(() => {
    if (!saved) return;
    const wrongReviews = Array.from({ length: exam.total }, (_, index) => index + 1).filter((number) => answers[number] !== exam.answerKey[number]).map((number) => ({ questionId: `pdf:${exam.id}:${number}`, questionNumber: number, myAnswer: answers[number] || null, correctAnswer: exam.answerKey[number], ...(reviewData.notes[number] || {}) }));
    updateAttempt(attemptId, { topic: reviewData.topic, wrongReviews });
  }, [saved, attemptId, reviewData, exam, answers]);

  if (submitted && !viewOnly) {
    const correct = Object.entries(exam.answerKey).filter(([number, answer]) => answers[number] === answer).length;
    const wrongQuestions = Array.from({ length: exam.total }, (_, i) => i + 1).filter((number) => answers[number] !== exam.answerKey[number]).map((number) => ({ number, myAnswer: answers[number] || null, correctAnswer: exam.answerKey[number] }));
    return <main className="pdf-results-shell"><header className="bank-header"><button className="button button-secondary" onClick={onExit}><ArrowLeft size={16} /> 나가기</button><div><span className="eyebrow">OMR RESULT</span><h1>{exam.name}</h1></div></header><section className="result-summary"><span className="eyebrow">{exam.subjectName} 채점 결과</span><h1>{correct}<span> / {exam.total}</span></h1><p>{Math.round(correct / exam.total * 100)}% 정답 · {saved ? '점수 기록 저장 완료' : '점수 기록 저장 중'}</p><div className="score-track"><span style={{ width: `${correct / exam.total * 100}%` }} /></div></section><section className="result-card"><div className="result-table-wrap"><table className="result-table"><thead><tr><th>문항</th><th>내 답</th><th>정답</th><th>결과</th></tr></thead><tbody>{Array.from({ length: exam.total }, (_, i) => i + 1).map((number) => { const right = answers[number] === exam.answerKey[number]; return <tr key={number}><th>{number}번</th><td>{answers[number] || <span className="unanswered">미응답</span>}</td><td>{exam.answerKey[number]}</td><td><span className={`result-pill ${right ? 'correct' : 'incorrect'}`}>{right ? 'O 정답' : 'X 오답'}</span></td></tr>; })}</tbody></table></div></section><PdfReview exam={exam} wrongQuestions={wrongQuestions} attemptId={attemptId} onNotesChange={setReviewData} onOpenBank={onOpenBank} /><div className="result-actions"><button className="button button-primary" onClick={onExit}>시험지 목록</button></div></main>;
  }

  return <main className={`pdf-exam-shell ${viewOnly ? 'pdf-reader-mode' : ''}`}><header className="pdf-exam-header"><button className="icon-button" onClick={onExit} aria-label="공부방으로"><ArrowLeft size={18} /></button><div className="pdf-exam-title"><strong>{exam.name}</strong><small>{exam.subjectName} · {viewOnly ? '개념 PDF' : `${exam.total}문항 OMR 풀이`}</small></div>{!viewOnly && <><span className={`exam-clock ${remaining <= 300 ? 'is-warning' : ''}`} role="timer"><Clock3 size={15} /> {clockText(remaining)}</span><button className="button button-primary pdf-submit-top" onClick={submit}>제출</button></>}</header>
    {loadError ? <section className="pdf-load-error"><p>{loadError}</p><button className="button button-secondary" onClick={onExit}>목록으로</button></section> : <div className="pdf-exam-layout"><section className="pdf-page-area"><div className="pdf-page-toolbar"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeft size={14} /> 이전</button><span><FileText size={14} /> {page} / {pageCount || '…'} 쪽</span><button className="button button-secondary" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>다음 <ArrowRight size={14} /></button><button className={`button ${clearerText ? 'button-primary' : 'button-secondary'} pdf-contrast-toggle`} onClick={() => setClearerText((value) => !value)} aria-pressed={clearerText} title="글씨 대비 조절"><Sun size={14} /> 선명</button><button className={`button ${drawEnabled ? 'button-primary' : 'button-secondary'} pdf-pen-toggle`} onClick={() => setDrawEnabled((value) => !value)} aria-pressed={drawEnabled}><Pencil size={14} /> {drawEnabled ? '필기 중' : '필기'}</button><button className="button button-secondary pdf-erase-button" onClick={clearPageMarks} title="현재 쪽 필기 지우기"><Eraser size={14} /></button></div><div className="pdf-canvas-frame" ref={frameRef}>{pdf ? <div className="pdf-document-page" style={{ width: pageSize.width || undefined, height: pageSize.height || undefined }}><canvas ref={canvasRef} className={clearerText ? 'pdf-clearer-text' : ''} aria-label={`시험지 ${page}쪽`} /><canvas ref={inkCanvasRef} className={`pdf-ink-canvas ${drawEnabled ? 'ink-enabled' : ''}`} onPointerDown={beginInk} onPointerMove={moveInk} onPointerUp={endInk} onPointerCancel={endInk} aria-label="PDF 위 필기 영역" /></div> : <span>원본 PDF 여는 중…</span>}</div></section></div>}
    {!viewOnly && !submitted && <button className="omr-mobile-trigger" onClick={() => setOmrOpen(true)}><Grid3X3 size={17} /> OMR 답안 <span>{Object.keys(answers).length}/{exam.total}</span></button>}
    {omrOpen && <div className="omr-mobile-backdrop" onClick={() => setOmrOpen(false)}><section className="omr-mobile-sheet" onClick={(event) => event.stopPropagation()}><div className="omr-sheet-grabber"/><div className="omr-heading"><div><span className="eyebrow">ANSWER SHEET</span><h2>OMR 답안</h2></div><button className="button button-secondary" onClick={() => setOmrOpen(false)}>닫기</button></div><div className="omr-progress"><span style={{ width: `${Object.keys(answers).length / exam.total * 100}%` }} /></div><div className="omr-mobile-grid">{Array.from({ length: exam.total }, (_, i) => i + 1).map((number) => <div className="omr-row" key={number}><span className={`omr-number ${answers[number] ? 'answered' : ''}`}>{number}</span><div className="omr-options">{[1, 2, 3, 4, 5].map((answer) => <button key={answer} className={answers[number] === answer ? 'chosen' : ''} aria-label={`${number}번 ${answer}번 선택`} onClick={() => setAnswers((previous) => ({ ...previous, [number]: answer }))}>{answer}</button>)}</div></div>)}</div><button className="button button-primary omr-submit" onClick={submit}><Check size={15} /> 답안 제출 및 채점</button></section></div>}
  </main>;
}

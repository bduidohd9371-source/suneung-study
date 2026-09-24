import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Eraser, FileText, Grid3X3, Pencil, Sun } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { deletePdfExamDraft, getPageMarks, getPdfExam, getPdfExamDraft, savePageMarks, savePdfExamDraft } from './pdfStorage.js';
import { saveAttempt, updateAttempt } from './studyStorage.js';
import { recordExamClear } from './clearStorage.js';
import PdfReview from './PdfReview.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const clockText = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;

export default function PdfExam({ exam, onExit, onOpenBank, viewOnly = false }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(exam.minutes * 60);
  const [draftReady, setDraftReady] = useState(viewOnly);
  const [draftLoaded, setDraftLoaded] = useState(null);
  const [draftSaveError, setDraftSaveError] = useState(false);
  const [omrOpen, setOmrOpen] = useState(false);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [eraseEnabled, setEraseEnabled] = useState(false);
  const [penColor, setPenColor] = useState('#2563eb');
  const [penSize, setPenSize] = useState(2.5);
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
  const erasingRef = useRef(false);
  const pixelRatioRef = useRef(1);
  const [frameWidth, setFrameWidth] = useState(0);
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;

  useEffect(() => {
    if (viewOnly) return undefined;
    let active = true;
    const draft = getPdfExamDraft(exam.id);
    if (draft) {
      setAnswers(draft.answers && typeof draft.answers === 'object' ? draft.answers : {});
      setRemaining(Number.isFinite(draft.remaining) ? Math.max(0, Math.min(exam.minutes * 60, draft.remaining)) : exam.minutes * 60);
      if (Number.isInteger(draft.page) && draft.page > 0) setPage(draft.page);
      setDraftLoaded(draft);
    }
    if (active) setDraftReady(true);
    return () => { active = false; };
  }, [exam.id, exam.minutes, viewOnly]);

  const persistDraft = useCallback((patch = {}) => {
    if (viewOnly || !draftReady || submitted) return;
    const ok = savePdfExamDraft(exam.id, { answers, page, remaining: remainingRef.current, ...patch });
    setDraftSaveError(!ok);
  }, [answers, draftReady, exam.id, page, submitted, viewOnly]);

  const exit = useCallback(() => {
    persistDraft({ remaining: remainingRef.current });
    onExit();
  }, [onExit, persistDraft]);

  useEffect(() => { persistDraft(); }, [answers, page, persistDraft]);
  useEffect(() => {
    if (viewOnly || !draftReady || submitted) return undefined;
    const id = window.setInterval(() => persistDraft({ remaining: remainingRef.current }), 5000);
    const saveOnExit = () => persistDraft({ remaining: remainingRef.current });
    window.addEventListener('pagehide', saveOnExit);
    return () => { window.clearInterval(id); window.removeEventListener('pagehide', saveOnExit); };
  }, [draftReady, persistDraft, submitted, viewOnly]);

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
    }).then((document) => { if (active) { setPdf(document); setPageCount(document.numPages); setPage((current) => Math.min(current, document.numPages)); } })
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
    if ((!drawEnabled && !eraseEnabled) || event.pointerType !== 'pen') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    if (eraseEnabled) {
      erasingRef.current = true;
      eraseAtPoint(pointFromEvent(event));
      return;
    }
    drawingRef.current = true;
    const pressure = event.pressure > 0 ? 0.65 + event.pressure * 0.7 : 1;
    const next = [...marksRef.current, { color: penColor, width: (penSize * pressure) / Math.max(1, pageSize.width), points: [pointFromEvent(event)] }];
    marksRef.current = next;
    setPageMarks(next);
  }
  function moveInk(event) {
    if ((!drawingRef.current && !erasingRef.current) || event.pointerType !== 'pen') return;
    event.preventDefault();
    if (erasingRef.current) { eraseAtPoint(pointFromEvent(event)); return; }
    const next = [...marksRef.current];
    const last = next[next.length - 1];
    last.points.push(pointFromEvent(event));
    marksRef.current = next;
    setPageMarks(next);
  }
  async function endInk(event) {
    if (event?.pointerType && event.pointerType !== 'pen') return;
    if (!drawingRef.current && !erasingRef.current) return;
    drawingRef.current = false;
    erasingRef.current = false;
    try { await savePageMarks(exam.id, page, marksRef.current); } catch { setLoadError('필기를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
  }
  function eraseAtPoint(point) {
    const radius = 19;
    const px = point.x * pageSize.width;
    const py = point.y * pageSize.height;
    const distanceToSegment = (a, b) => {
      const ax = a.x * pageSize.width; const ay = a.y * pageSize.height;
      const bx = b.x * pageSize.width; const by = b.y * pageSize.height;
      const dx = bx - ax; const dy = by - ay;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)) : 0;
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    };
    const hit = (stroke) => {
      const points = stroke.points || [];
      if (points.length === 1) return distanceToSegment(points[0], points[0]) <= radius;
      return points.slice(1).some((point, index) => distanceToSegment(points[index], point) <= radius);
    };
    const next = marksRef.current.filter((stroke) => !hit(stroke));
    if (next.length !== marksRef.current.length) { marksRef.current = next; setPageMarks(next); }
  }
  useEffect(() => {
    if (viewOnly || !pdf || !draftReady) return undefined;
    if (submitted || remaining <= 0) { if (!submitted && remaining <= 0) setSubmitted(true); return undefined; }
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [draftReady, pdf, remaining, submitted, viewOnly]);

  const submit = useCallback(() => {
    const unanswered = Math.max(0, exam.total - Object.keys(answers).length);
    if (unanswered && !window.confirm(`${unanswered}문항이 비어 있어요. 미응답으로 제출할까요?`)) return;
    setSubmitted(true);
  }, [answers, exam.total]);
  useEffect(() => {
    if (!submitted || saved) return;
    const correct = Object.entries(exam.answerKey).filter(([number, answer]) => answers[number] === answer).length;
    const wrongReviews = Array.from({ length: exam.total }, (_, index) => index + 1).filter((number) => answers[number] !== exam.answerKey[number]).map((number) => ({ questionId: `pdf:${exam.id}:${number}`, questionNumber: number, myAnswer: answers[number] || null, correctAnswer: exam.answerKey[number] }));
    const ok = saveAttempt({ id: attemptId, createdAt: new Date().toISOString(), subjectId: exam.subjectId, subjectName: exam.subjectName, total: exam.total, correct, durationSeconds: exam.minutes * 60 - remaining, answers, source: exam.name, sourceExamId: exam.id, topic: '', wrongReviews });
    if (ok) { deletePdfExamDraft(exam.id); recordExamClear(exam); setSaved(true); }
  }, [submitted, saved, answers, exam, remaining, attemptId]);
  useEffect(() => {
    if (!saved) return;
    const wrongReviews = Array.from({ length: exam.total }, (_, index) => index + 1).filter((number) => answers[number] !== exam.answerKey[number]).map((number) => ({ questionId: `pdf:${exam.id}:${number}`, questionNumber: number, myAnswer: answers[number] || null, correctAnswer: exam.answerKey[number], ...(reviewData.notes[number] || {}) }));
    updateAttempt(attemptId, { topic: reviewData.topic, wrongReviews });
  }, [saved, attemptId, reviewData, exam, answers]);

  if (submitted && !viewOnly) {
    const correct = Object.entries(exam.answerKey).filter(([number, answer]) => answers[number] === answer).length;
    const wrongQuestions = Array.from({ length: exam.total }, (_, i) => i + 1).filter((number) => answers[number] !== exam.answerKey[number]).map((number) => ({ number, myAnswer: answers[number] || null, correctAnswer: exam.answerKey[number] }));
    return <main className="pdf-results-shell"><header className="bank-header"><button className="button button-secondary" onClick={exit}><ArrowLeft size={16} /> 나가기</button><div><span className="eyebrow">OMR RESULT</span><h1>{exam.name}</h1></div></header><section className="result-summary"><span className="eyebrow">{exam.subjectName} 채점 결과</span><h1>{correct}<span> / {exam.total}</span></h1><p>{Math.round(correct / exam.total * 100)}% 정답 · {saved ? '점수 기록 저장 완료' : '점수 기록 저장 중'}</p><div className="score-track"><span style={{ width: `${correct / exam.total * 100}%` }} /></div></section><section className="result-card"><div className="result-table-wrap"><table className="result-table"><thead><tr><th>문항</th><th>내 답</th><th>정답</th><th>결과</th></tr></thead><tbody>{Array.from({ length: exam.total }, (_, i) => i + 1).map((number) => { const right = answers[number] === exam.answerKey[number]; return <tr key={number}><th>{number}번</th><td>{answers[number] || <span className="unanswered">미응답</span>}</td><td>{exam.answerKey[number]}</td><td><span className={`result-pill ${right ? 'correct' : 'incorrect'}`}>{right ? 'O 정답' : 'X 오답'}</span></td></tr>; })}</tbody></table></div></section><PdfReview exam={exam} wrongQuestions={wrongQuestions} attemptId={attemptId} onNotesChange={setReviewData} onOpenBank={onOpenBank} /><div className="result-actions"><button className="button button-primary" onClick={exit}>시험지 목록</button></div></main>;
  }

  return <main className={`pdf-exam-shell ${viewOnly ? 'pdf-reader-mode' : ''}`}><header className="pdf-exam-header"><button className="icon-button" onClick={exit} aria-label="공부방으로"><ArrowLeft size={18} /></button><div className="pdf-exam-title"><strong>{exam.name}</strong><small>{exam.subjectName} · {viewOnly ? '개념 PDF' : `${exam.total}문항 OMR 풀이`}</small></div>{!viewOnly && <><span className={`exam-clock ${remaining <= 300 ? 'is-warning' : ''}`} role="timer"><Clock3 size={15} /> {clockText(remaining)}</span><button className="button button-primary pdf-submit-top" onClick={submit}>제출</button></>}</header>
    {!viewOnly && draftReady && <p className={`pdf-draft-status ${draftSaveError ? 'has-error' : ''}`} role={draftSaveError ? 'alert' : 'status'}>{draftLoaded ? `이전 풀이를 복구했어요 · ${Object.keys(answers).length}/${exam.total}개 답변 · 저장 ${new Date(draftLoaded.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '답안은 이 기기에 자동 저장돼요.'}{draftSaveError && <span> · 저장 공간을 확인해 주세요</span>}</p>}
    {loadError ? <section className="pdf-load-error"><p>{loadError}</p><button className="button button-secondary" onClick={exit}>목록으로</button></section> : <div className="pdf-exam-layout"><section className="pdf-page-area"><div className="pdf-page-toolbar"><button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeft size={14} /> 이전</button><span><FileText size={14} /> {page} / {pageCount || '…'} 쪽</span><button className="button button-secondary" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>다음 <ArrowRight size={14} /></button><button className={`button ${clearerText ? 'button-primary' : 'button-secondary'} pdf-contrast-toggle`} onClick={() => setClearerText((value) => !value)} aria-pressed={clearerText} title="글씨 대비 조절"><Sun size={14} /> 선명</button><button className={`button ${drawEnabled ? 'button-primary' : 'button-secondary'} pdf-pen-toggle`} onClick={() => { setDrawEnabled((value) => !value); setEraseEnabled(false); }} aria-pressed={drawEnabled}><Pencil size={14} /> {drawEnabled ? '필기 중' : '필기'}</button><button className={`button ${eraseEnabled ? 'button-primary' : 'button-secondary'} pdf-pen-toggle`} onClick={() => { setEraseEnabled((value) => !value); setDrawEnabled(false); }} aria-label={eraseEnabled ? '지우개 사용 중' : '지우개 모드'} aria-pressed={eraseEnabled}><Eraser size={14} /> {eraseEnabled ? '지우는 중' : '지우개'}</button>{drawEnabled && <><label className="pdf-pen-size">굵기 <select value={penSize} onChange={(event) => setPenSize(Number(event.target.value))} aria-label="펜 굵기"><option value={1.5}>가는 선</option><option value={2.5}>보통</option><option value={4}>굵은 선</option></select></label><div className="pdf-pen-colors" role="group" aria-label="펜 색상">{[{ color: '#20232a', name: '검정' }, { color: '#2563eb', name: '파랑' }, { color: '#d33f49', name: '빨강' }, { color: '#16845b', name: '초록' }].map(({ color, name }) => <button type="button" key={color} className={`pdf-pen-color ${penColor === color ? 'selected' : ''}`} style={{ '--pen-color': color }} onClick={() => setPenColor(color)} aria-label={`${name} 펜`} aria-pressed={penColor === color} />)}</div></>}<small className="pdf-pen-hint">{drawEnabled || eraseEnabled ? 'S펜 전용 · 손가락은 페이지 이동' : '필기 버튼을 누른 뒤 S펜 사용'}</small></div><div className="pdf-canvas-frame" ref={frameRef}>{pdf ? <div className="pdf-document-page" style={{ width: pageSize.width || undefined, height: pageSize.height || undefined }}><canvas ref={canvasRef} className={clearerText ? 'pdf-clearer-text' : ''} aria-label={`시험지 ${page}쪽`} /><canvas ref={inkCanvasRef} className={`pdf-ink-canvas ${drawEnabled || eraseEnabled ? 'ink-enabled' : ''} ${eraseEnabled ? 'ink-erasing' : ''}`} onPointerDown={beginInk} onPointerMove={moveInk} onPointerUp={endInk} onPointerCancel={endInk} aria-label={eraseEnabled ? 'S펜으로 지울 필기를 눌러 지우세요' : 'S펜 전용 PDF 필기 영역'} /></div> : <span>원본 PDF 여는 중…</span>}</div></section></div>}
    {!viewOnly && !submitted && <button className="omr-mobile-trigger" onClick={() => setOmrOpen(true)}><Grid3X3 size={17} /> OMR 답안 <span>{Object.keys(answers).length}/{exam.total}</span></button>}
    {omrOpen && <div className="omr-mobile-backdrop" onClick={() => setOmrOpen(false)}><section className="omr-mobile-sheet" onClick={(event) => event.stopPropagation()}><div className="omr-sheet-grabber"/><div className="omr-heading"><div><span className="eyebrow">ANSWER SHEET</span><h2>OMR 답안</h2></div><button className="button button-secondary" onClick={() => setOmrOpen(false)}>닫기</button></div><div className="omr-progress"><span style={{ width: `${Object.keys(answers).length / exam.total * 100}%` }} /></div><div className="omr-mobile-grid">{Array.from({ length: exam.total }, (_, i) => i + 1).map((number) => <div className="omr-row" key={number}><span className={`omr-number ${answers[number] ? 'answered' : ''}`}>{number}</span><div className="omr-options">{[1, 2, 3, 4, 5].map((answer) => <button key={answer} className={answers[number] === answer ? 'chosen' : ''} aria-label={`${number}번 ${answer}번 선택`} onClick={() => setAnswers((previous) => ({ ...previous, [number]: answer }))}>{answer}</button>)}</div></div>)}</div><button className="button button-primary omr-submit" onClick={submit}><Check size={15} /> 답안 제출 및 채점</button></section></div>}
  </main>;
}

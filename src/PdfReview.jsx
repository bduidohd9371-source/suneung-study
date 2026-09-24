import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Check, Sparkles } from 'lucide-react';
import mockQuestions from './data/mockQuestions.json';
import { readImportedQuestions } from './studyStorage.js';

const REASONS = ['개념 부족', '계산 실수', '조건 놓침', '문제 오독', '시간 압박', '선지 판단'];

export default function PdfReview({ exam, wrongQuestions, attemptId, onNotesChange, onOpenBank }) {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState({});
  const [pendingId, setPendingId] = useState('');
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState({});
  const availableQuestions = useMemo(() => [
    ...mockQuestions.filter((question) => question.subjectId === exam.subjectId),
    ...readImportedQuestions(exam.subjectId),
  ], [exam.subjectId]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`suneung-pdf-review-${attemptId}`) || '{}');
      setTopic(saved.topic || '');
      setNotes(saved.notes || {});
    } catch { /* ignore malformed local notes */ }
  }, [attemptId]);

  useEffect(() => {
    try { localStorage.setItem(`suneung-pdf-review-${attemptId}`, JSON.stringify({ topic, notes })); } catch { /* optional local note */ }
    onNotesChange({ topic, notes });
  }, [topic, notes, attemptId]);

  const keywords = topic.trim().toLocaleLowerCase().split(/[\s,，/]+/).filter((word) => word.length >= 2);
  const recommendations = keywords.length ? availableQuestions.map((question) => {
    const text = `${question.prompt} ${(question.options || []).join(' ')}`.toLocaleLowerCase();
    const matched = keywords.filter((word) => text.includes(word));
    return { question, score: matched.length, matched };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3) : [];

  function patchNote(number, patch) {
    setNotes((current) => ({ ...current, [number]: { ...current[number], ...patch } }));
  }

  async function askFeedback(number, wrong, note) {
    setPendingId(String(number));
    setErrors((current) => ({ ...current, [number]: '' }));
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: exam.subjectName,
          question: note.questionText,
          myAnswer: wrong.myAnswer ? `${wrong.myAnswer}번` : '미응답',
          correctAnswer: `${wrong.correctAnswer}번`,
          reason: note.reason,
          insight: note.insight,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.feedback) throw new Error(result?.error || 'AI 피드백을 받지 못했어요.');
      setFeedback((current) => ({ ...current, [number]: result.feedback }));
    } catch (error) { setErrors((current) => ({ ...current, [number]: error.message || '요청에 실패했어요.' })); }
    finally { setPendingId(''); }
  }

  return <section className="pdf-review-section"><header className="pdf-review-header"><span className="eyebrow">REVIEW & NEXT PRACTICE</span><h2>오답 복습과 유사 문제</h2><p>PDF 문제를 자동으로 읽지 않아요. 핵심 개념을 적으면 이 기기의 문제 목록에서 관련 문항을 찾아요.</p></header>
    <label className="pdf-topic-field">이 시험에서 헷갈린 핵심 개념·키워드<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="예: 일차방정식, 수열" /></label>
    {topic && <div className="pdf-recommendations"><div className="pdf-recommendation-title"><strong><Sparkles size={15} /> 이 기기의 관련 문제</strong>{onOpenBank && <button className="button button-secondary" onClick={onOpenBank}><BookOpenCheck size={14} /> 문제 목록</button>}</div>{recommendations.length ? recommendations.map(({ question, matched }) => <article className="pdf-recommendation" key={question.id}><span>{matched.join(' · ')}</span><p>{question.prompt}</p></article>) : <p className="pdf-no-recommendations">입력한 키워드와 겹치는 저장 문제가 없어요. 같은 과목 문제를 추가하면 여기서 추천할 수 있어요.</p>}</div>}
    {wrongQuestions.length > 0 ? <div className="pdf-wrong-list">{wrongQuestions.map((wrong) => { const note = notes[wrong.number] || {}; const canAsk = note.reason && note.insight?.trim().length >= 5 && note.questionText?.trim().length >= 8; return <article className="pdf-wrong-review" key={wrong.number}><div className="pdf-wrong-heading"><strong>문항 {wrong.number}</strong><span>내 답 {wrong.myAnswer || '미응답'} · 정답 {wrong.correctAnswer}</span></div><fieldset className="reason-field"><legend>틀린 이유 <span>선택</span></legend><div className="reason-tags">{REASONS.map((reason) => <button type="button" key={reason} className={`reason-tag ${note.reason === reason ? 'selected' : ''}`} aria-pressed={note.reason === reason} onClick={() => patchNote(wrong.number, { reason })}>{reason}</button>)}</div></fieldset><label className="pdf-wrong-context">문제의 핵심 조건이나 문장 <span>AI 피드백을 원할 때 입력</span><textarea value={note.questionText || ''} onChange={(event) => patchNote(wrong.number, { questionText: event.target.value })} rows={2} placeholder="PDF에서 문제의 핵심 부분을 직접 적어 주세요." /></label><label className="pdf-wrong-context">다음에 적용할 풀이 발상<textarea value={note.insight || ''} onChange={(event) => patchNote(wrong.number, { insight: event.target.value })} rows={2} placeholder="예: 조건을 식으로 옮긴 뒤 부호를 다시 확인한다." /></label><div className="pdf-ai-row"><button className="button button-secondary" disabled={!canAsk || pendingId === String(wrong.number)} onClick={() => askFeedback(wrong.number, wrong, note)}><Sparkles size={14} /> {pendingId === String(wrong.number) ? '피드백 요청 중…' : 'AI 개념 피드백'}</button><small>선택한 문제 내용과 메모가 전송돼요. API 설정과 별도 사용료가 필요합니다.</small></div>{feedback[wrong.number] && <p className="ai-feedback-result">{feedback[wrong.number]}</p>}{errors[wrong.number] && <p className="ai-feedback-error" role="alert">{errors[wrong.number]}</p>}</article>; })}</div> : <p className="analytics-empty">오답이 없어 복습 기록이 필요하지 않아요.</p>}
    <p className="pdf-review-save"><Check size={14} /> 메모와 키워드는 이 기기와 풀이 기록에 저장됩니다.</p>
  </section>;
}

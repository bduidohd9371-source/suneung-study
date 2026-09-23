import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw } from 'lucide-react';
import questionData from './data/mockQuestions.json';
import ReviewCanvas from './ReviewCanvas.jsx';
import { readImportedQuestions, saveAttempt } from './studyStorage.js';

const MISTAKE_REASONS = ['개념 부족', '계산 실수', '조건 놓침', '문제 오독', '시간 압박', '선지 판단'];

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function ExamSession({ subject, onExit }) {
  const questions = useMemo(() => {
    const builtIn = questionData.filter((question) => question.subjectId === subject.id);
    const imported = readImportedQuestions(subject.id).map((question, index) => ({ ...question, number: builtIn.length + index + 1 }));
    return [...builtIn, ...imported];
  }, [subject.id]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(subject.minutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [reviewEntries, setReviewEntries] = useState({});
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const current = questions[currentIndex];
  const correctCount = questions.filter((question) => answers[question.id] === question.correctAnswer).length;
  const answeredCount = Object.keys(answers).length;
  const wrongQuestions = questions.filter((question) => answers[question.id] !== question.correctAnswer);
  const canSave = wrongQuestions.every((question) => {
    const review = reviewEntries[question.id];
    return review?.reason && review?.insight?.trim().length >= 5;
  });

  useEffect(() => {
    if (submitted) return undefined;
    if (remaining <= 0) {
      setSubmitted(true);
      return undefined;
    }
    const timerId = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timerId);
  }, [remaining, submitted]);

  function updateReview(questionId, patch) {
    setReviewEntries((previous) => ({
      ...previous,
      [questionId]: { strokes: [], ...previous[questionId], ...patch },
    }));
  }

  function finishAndSave() {
    if (!canSave || saved) return;
    const attempt = {
      id: globalThis.crypto?.randomUUID?.() || `attempt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      subjectId: subject.id,
      subjectName: subject.name,
      total: questions.length,
      correct: correctCount,
      durationSeconds: subject.minutes * 60 - remaining,
      answers,
      wrongReviews: wrongQuestions.map((question) => ({
        questionId: question.id,
        questionNumber: question.number,
        myAnswer: answers[question.id] ?? null,
        correctAnswer: question.correctAnswer,
        reason: reviewEntries[question.id].reason,
        insight: reviewEntries[question.id].insight.trim(),
        strokes: reviewEntries[question.id].strokes,
        aiFeedback: reviewEntries[question.id].aiFeedback || null,
      })),
    };
    const success = saveAttempt(attempt);
    setSaveFailed(!success);
    if (success) setSaved(true);
  }

  function replay() {
    setAnswers({});
    setReviewEntries({});
    setCurrentIndex(0);
    setRemaining(subject.minutes * 60);
    setSubmitted(false);
    setSaved(false);
    setSaveFailed(false);
  }

  async function requestAiFeedback(question, review) {
    updateReview(question.id, { feedbackLoading: true, feedbackError: '' });
    try {
      const result = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.name,
          question: question.prompt,
          myAnswer: answers[question.id] ? `${answers[question.id]}. ${question.options[answers[question.id] - 1]}` : '미응답',
          correctAnswer: `${question.correctAnswer}. ${question.options[question.correctAnswer - 1]}`,
          reason: review.reason,
          insight: review.insight,
        }),
      });
      const data = await result.json().catch(() => null);
      if (!result.ok || !data?.feedback) throw new Error(data?.error || 'AI 피드백은 Vercel 서버 함수와 별도 API 설정이 필요해요.');
      updateReview(question.id, { aiFeedback: data.feedback });
    } catch (error) {
      updateReview(question.id, { feedbackError: error.message || 'AI 연결에 실패했어요.' });
    } finally {
      updateReview(question.id, { feedbackLoading: false });
    }
  }

  if (!questions.length) return <main className="exam-shell"><p>이 과목의 연습 문제가 아직 준비되지 않았어요.</p><button className="button button-primary" onClick={onExit}>홈으로 돌아가기</button></main>;

  if (submitted) {
    return (
      <main className="exam-shell results-shell">
        <header className="exam-header"><div className="exam-brand">수능<span>루틴</span><small>채점 결과와 오답 복습</small></div><span className="exam-status">{saved ? '기록 저장 완료' : '오답 기록 필요'}</span></header>
        <section className="result-summary"><span className="eyebrow">{subject.name} 실전 연습 완료</span><h1>{correctCount}<span> / {questions.length}</span></h1><p>{answeredCount === questions.length ? '모든 문항을 풀었어요.' : `${questions.length - answeredCount}문항을 미응답으로 제출했어요.`}</p><div className="score-track"><span style={{ width: `${(correctCount / questions.length) * 100}%` }} /></div></section>
        <section className="result-card"><div className="result-heading"><div><span className="eyebrow">ANSWER REVIEW</span><h2>문항별 채점</h2></div><span className="result-count">{questions.length}문항</span></div><div className="result-table-wrap"><table className="result-table"><thead><tr><th scope="col">문항</th><th scope="col">내 답</th><th scope="col">정답</th><th scope="col">결과</th></tr></thead><tbody>{questions.map((question) => { const chosen = answers[question.id]; const isCorrect = chosen === question.correctAnswer; return <tr key={question.id}><th scope="row">{question.number}번</th><td>{chosen ?? <span className="unanswered">미응답</span>}</td><td>{question.correctAnswer}</td><td><span className={`result-pill ${isCorrect ? 'correct' : 'incorrect'}`}>{isCorrect ? 'O 정답' : 'X 오답'}</span></td></tr>; })}</tbody></table></div></section>

        {wrongQuestions.length > 0 && <section className="review-notes-section"><div className="review-section-heading"><span className="eyebrow">ERROR NOTE</span><h2>틀린 이유와 다음 발상을 남겨요</h2><p>각 오답마다 이유와 다음 풀이의 핵심을 적어야 기록할 수 있어요.</p></div>{wrongQuestions.map((question) => { const review = reviewEntries[question.id] || { strokes: [] }; return <article className="wrong-review-card" key={question.id}><div className="wrong-review-title"><span className="question-number">QUESTION {String(question.number).padStart(2, '0')}</span><span className="result-pill incorrect">내 답 {answers[question.id] ?? '미응답'} · 정답 {question.correctAnswer}</span></div><p className="wrong-question-prompt">{question.prompt}</p><fieldset className="reason-field"><legend>왜 틀렸나요? <span>필수</span></legend><div className="reason-tags">{MISTAKE_REASONS.map((reason) => <button type="button" key={reason} className={`reason-tag ${review.reason === reason ? 'selected' : ''}`} aria-pressed={review.reason === reason} onClick={() => updateReview(question.id, { reason })}>{reason}</button>)}</div></fieldset><label className="insight-field">다음엔 어떤 발상·접근으로 풀 건가요? <span>필수 · 5자 이상</span><textarea value={review.insight || ''} onChange={(event) => updateReview(question.id, { insight: event.target.value })} maxLength={300} rows={3} placeholder="예: 조건을 식으로 옮긴 뒤, 부호를 마지막에 다시 확인한다." /></label><div className="canvas-field"><div className="canvas-title">풀이 흔적 <span>선택</span></div><ReviewCanvas strokes={review.strokes || []} onChange={(strokes) => updateReview(question.id, { strokes })} /></div><div className="ai-feedback-row"><button className="button button-secondary ai-feedback-button" onClick={() => requestAiFeedback(question, review)} disabled={!review.reason || !review.insight?.trim() || review.feedbackLoading}><span>{review.feedbackLoading ? '피드백 요청 중…' : 'AI 피드백 받기'}</span></button><small>문항과 메모가 전송되며 API 사용료가 발생할 수 있어요.</small></div>{review.aiFeedback && <p className="ai-feedback-result">{review.aiFeedback}</p>}{review.feedbackError && <p className="ai-feedback-error" role="alert">{review.feedbackError}</p>}</article>; })}</section>}

        {saveFailed && <p className="save-error" role="alert">기기에 저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 눌러주세요.</p>}
        <div className="result-actions review-save-actions">{saved ? <><span className="saved-confirmation"><Check size={15} /> 기록이 이 기기에 저장됐어요.</span><button className="button button-secondary" onClick={replay}><RotateCcw size={14} /> 다시 풀기</button><button className="button button-primary" onClick={onExit}>홈으로</button></> : <><span className="review-required-hint">{wrongQuestions.length === 0 ? '기록을 저장할 준비가 됐어요.' : canSave ? '모든 오답 기록을 작성했어요.' : `오답 ${wrongQuestions.filter((question) => !reviewEntries[question.id]?.reason || reviewEntries[question.id]?.insight?.trim().length < 5).length}개 기록이 더 필요해요.`}</span><button className="button button-primary" onClick={finishAndSave} disabled={!canSave}><Check size={15} /> 오답 기록 저장</button></>}</div>
      </main>
    );
  }

  return (
    <main className="exam-shell">
      <header className="exam-header"><button className="icon-button" onClick={onExit} aria-label="풀이 종료하고 홈으로"><ArrowLeft size={18} /></button><div className="exam-brand">수능<span>루틴</span><small>{subject.name} 실전 연습</small></div><div className={`exam-clock ${remaining <= 300 ? 'is-warning' : ''}`} role="timer"><Clock3 size={16} /> {formatTime(remaining)}</div></header>
      <div className="exam-progress-row"><span>{currentIndex + 1}<i> / {questions.length}</i></span><span>{answeredCount}개 답변 완료</span></div><div className="exam-progress"><span style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div>
      <section className="question-card"><div className="question-meta"><span className="question-number">QUESTION {String(current.number).padStart(2, '0')}</span><span className="question-subject">{subject.name}</span></div><h1 className="question-prompt">{current.prompt}</h1><div className="answer-options" role="group" aria-label={`${current.number}번 답 선택`}>{current.options.map((option, index) => { const answer = index + 1; const selected = answers[current.id] === answer; return <button key={answer} className={`answer-option ${selected ? 'is-chosen' : ''}`} aria-pressed={selected} onClick={() => setAnswers((previous) => ({ ...previous, [current.id]: answer }))}><span className="option-number">{answer}</span><span>{option}</span>{selected && <Check className="option-check" size={17} />}</button>; })}</div></section>
      <nav className="question-nav" aria-label="문항 이동">{questions.map((question, index) => <button key={question.id} className={`question-dot ${index === currentIndex ? 'active' : ''} ${answers[question.id] ? 'answered' : ''}`} onClick={() => setCurrentIndex(index)} aria-label={`${question.number}번 문항으로 이동${answers[question.id] ? ', 답변 완료' : ''}`} aria-current={index === currentIndex ? 'step' : undefined}>{question.number}</button>)}</nav>
      <footer className="exam-footer"><button className="button button-secondary" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}><ArrowLeft size={15} /> 이전</button><span>{answeredCount}/{questions.length} 답변</span>{currentIndex < questions.length - 1 ? <button className="button button-primary" onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}>다음 <ArrowRight size={15} /></button> : <button className="button button-primary" onClick={() => setSubmitted(true)}>제출하고 채점 <Check size={15} /></button>}</footer>
    </main>
  );
}

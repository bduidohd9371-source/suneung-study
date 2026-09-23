import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw } from 'lucide-react';
import questionData from './data/mockQuestions.json';

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function ExamSession({ subject, onExit }) {
  const questions = useMemo(() => questionData.filter((question) => question.subjectId === subject.id), [subject.id]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(subject.minutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const current = questions[currentIndex];
  const correctCount = questions.filter((question) => answers[question.id] === question.correctAnswer).length;
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (submitted) return undefined;
    if (remaining <= 0) {
      setSubmitted(true);
      return undefined;
    }
    const timerId = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timerId);
  }, [remaining, submitted]);

  if (!questions.length) return <main className="exam-shell"><p>이 과목의 연습 문제가 아직 준비되지 않았어요.</p><button className="button button-primary" onClick={onExit}>홈으로 돌아가기</button></main>;

  if (submitted) {
    return (
      <main className="exam-shell results-shell">
        <header className="exam-header"><button className="icon-button" onClick={onExit} aria-label="홈으로 돌아가기"><ArrowLeft size={18} /></button><div className="exam-brand">수능<span>루틴</span><small>채점 결과</small></div><span className="exam-status">결과 확인</span></header>
        <section className="result-summary"><span className="eyebrow">{subject.name} 실전 연습 완료</span><h1>{correctCount}<span> / {questions.length}</span></h1><p>{answeredCount === questions.length ? '모든 문항을 풀었어요.' : `${questions.length - answeredCount}문항을 미응답으로 제출했어요.`}</p><div className="score-track"><span style={{ width: `${(correctCount / questions.length) * 100}%` }} /></div></section>
        <section className="result-card"><div className="result-heading"><div><span className="eyebrow">ANSWER REVIEW</span><h2>문항별 채점</h2></div><span className="result-count">{questions.length}문항</span></div><div className="result-table-wrap"><table className="result-table"><thead><tr><th scope="col">문항</th><th scope="col">내 답</th><th scope="col">정답</th><th scope="col">결과</th></tr></thead><tbody>{questions.map((question) => { const chosen = answers[question.id]; const isCorrect = chosen === question.correctAnswer; return <tr key={question.id}><th scope="row">{question.number}번</th><td>{chosen ?? <span className="unanswered">미응답</span>}</td><td>{question.correctAnswer}</td><td><span className={`result-pill ${isCorrect ? 'correct' : 'incorrect'}`}>{isCorrect ? 'O 정답' : 'X 오답'}</span></td></tr>; })}</tbody></table></div><div className="result-actions"><button className="button button-secondary" onClick={onExit}>홈으로</button><button className="button button-primary" onClick={() => { setAnswers({}); setCurrentIndex(0); setRemaining(subject.minutes * 60); setSubmitted(false); }}><RotateCcw size={15} /> 다시 풀기</button></div></section>
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

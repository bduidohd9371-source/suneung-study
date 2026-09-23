import { useEffect, useState } from 'react';
import { AlarmClock, ArrowUpRight, Check, RotateCcw } from 'lucide-react';
import { getDueReviews, getNextReviewAt, rateReview } from './reviewStorage.js';

function formatNext(value) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday ? '오늘' : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
}

export default function DueReviews({ onOpenPdf }) {
  const [items, setItems] = useState(getDueReviews);
  const [nextReview, setNextReview] = useState(getNextReviewAt);
  const [revealed, setRevealed] = useState({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const update = () => { setItems(getDueReviews()); setNextReview(getNextReviewAt()); };
    window.addEventListener('suneung:stats-updated', update);
    window.addEventListener('suneung:reviews-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('suneung:stats-updated', update);
      window.removeEventListener('suneung:reviews-updated', update);
      window.removeEventListener('storage', update);
    };
  }, [refresh]);

  function rate(item, value) {
    if (rateReview(item.key, value)) {
      setRevealed((current) => ({ ...current, [item.key]: false }));
      setRefresh((current) => current + 1);
    }
  }

  return <section className="due-review-card"><div className="due-review-header"><div><span className="eyebrow">SPACED REVIEW</span><h2>오늘 복습할 문제</h2></div><span className="due-review-count"><AlarmClock size={14} /> {items.length}개 대기</span></div>
    {items.length ? <><p className="due-review-intro">틀렸던 문제를 다시 떠올린 뒤 정답을 확인하세요. 기억한 정도에 따라 다음 복습 날짜를 정합니다.</p><div className="due-review-list">{items.slice(0, 3).map((item) => {
      const { review, attempt, question } = item;
      const prompt = review.questionText || question?.prompt || `원본 시험지에서 ${review.questionNumber}번 문항을 다시 풀어보세요.`;
      const isPdf = Boolean(attempt.sourceExamId);
      return <article className="due-review-item" key={item.key}><div className="due-review-item-head"><span>{attempt.subjectName} · {review.questionNumber}번</span><small>{attempt.source || '실전 풀이'} · {new Date(attempt.createdAt).toLocaleDateString('ko-KR')}</small></div><p className="due-review-prompt">{prompt}</p>{question?.options && <ol className="due-review-options">{question.options.map((option, index) => <li key={index}>{index + 1}. {option}</li>)}</ol>}{review.insight && <p className="due-review-insight"><b>내 풀이 발상</b> {review.insight}</p>}{review.reason && <span className="due-review-reason">틀린 이유: {review.reason}</span>}
        {isPdf && onOpenPdf && <button className="due-pdf-open" onClick={() => onOpenPdf(attempt.sourceExamId)}><ArrowUpRight size={13} /> 원본 PDF 열기</button>}
        {!revealed[item.key] ? <button className="due-reveal-button" onClick={() => setRevealed((current) => ({ ...current, [item.key]: true }))}>정답 확인</button> : <div className="due-answer">정답 {review.correctAnswer}번 <span>· 내 답 {review.myAnswer || '미응답'}</span></div>}
        {revealed[item.key] && <div className="due-rating"><span>다음 복습은?</span><button onClick={() => rate(item, 'again')}><RotateCcw size={13} /> 다시 헷갈림</button><button onClick={() => rate(item, 'good')}><Check size={13} /> 떠올렸어요</button><button onClick={() => rate(item, 'easy')}>쉬웠어요</button></div>}
      </article>;
    })}</div>{items.length > 3 && <p className="due-more-hint">복습 완료한 항목 다음에 남은 {items.length - 3}개가 표시돼요.</p>}</> : <p className="due-review-empty">{nextReview ? `다음 복습 예정: ${formatNext(nextReview)}` : '저장된 오답이 생기면 다음 날부터 자동으로 복습 일정에 들어가요.'}</p>}
  </section>;
}

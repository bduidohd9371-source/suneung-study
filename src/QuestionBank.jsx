import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Play, Trash2 } from 'lucide-react';
import { SUBJECTS } from './csat.js';
import questions from './data/mockQuestions.json';
import { deleteImportedQuestion, readImportedQuestions } from './studyStorage.js';

function QuestionBank({ initialSubject, onExit, onStart }) {
  const [subjectId, setSubjectId] = useState(initialSubject.id);
  const [version, setVersion] = useState(0);
  const subject = SUBJECTS.find((item) => item.id === subjectId) || SUBJECTS[0];
  const builtIn = useMemo(() => questions.filter((question) => question.subjectId === subjectId), [subjectId]);
  const imported = useMemo(() => readImportedQuestions(subjectId), [subjectId, version]);

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1);
    window.addEventListener('suneung:question-bank-updated', refresh);
    return () => window.removeEventListener('suneung:question-bank-updated', refresh);
  }, []);

  const entries = [
    ...builtIn.map((question, index) => ({ ...question, number: index + 1, origin: '기본 문제', removable: false })),
    ...imported.map((question, index) => ({ ...question, number: builtIn.length + index + 1, origin: question.source || '가져온 문제', removable: true })),
  ];

  function removeQuestion(question) {
    if (!window.confirm(`${question.number}번 가져온 문제를 삭제할까요?`)) return;
    if (deleteImportedQuestion(subjectId, question.id)) setVersion((value) => value + 1);
  }

  return (
    <main className="bank-shell">
      <header className="bank-header"><button className="button button-secondary" onClick={onExit}><ArrowLeft size={16} /> 홈</button><div><span className="eyebrow">QUESTION BANK</span><h1>과목별 문제 목록</h1></div></header>
      <section className="bank-controls"><label htmlFor="bank-subject">과목 선택</label><select id="bank-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span>{entries.length}문항</span><button className="button button-primary" onClick={() => onStart(subject)} disabled={!entries.length}><Play size={15} /> 풀이 시작</button></section>
      {!entries.length ? <section className="bank-empty"><BookOpen size={24} /><h2>등록된 문제가 없어요</h2><p>PDF에서 문제를 가져오면 이 목록에 표시돼요.</p></section> : <section className="bank-list" aria-label={`${subject.name} 문제 목록`}>
        {entries.map((question) => <details className="bank-item" key={question.id}><summary><span className="bank-number">{question.number}</span><span className="bank-summary-text">{question.prompt.split('\n').filter(Boolean)[0].slice(0, 100)}</span><span className="bank-origin">{question.origin}</span></summary><div className="bank-detail"><p>{question.prompt}</p><ol>{question.options.map((option, index) => <li key={`${question.id}-${index}`}><b>{index + 1}</b>{option}</li>)}</ol><p className="bank-answer">정답 {question.correctAnswer}번</p>{question.removable && <button className="bank-delete" onClick={() => removeQuestion(question)}><Trash2 size={14} /> 가져온 문제 삭제</button>}</div></details>)}
      </section>}
      <p className="bank-storage-note">문제와 목록은 현재 사용 중인 브라우저에 저장돼요.</p>
    </main>
  );
}

export default QuestionBank;

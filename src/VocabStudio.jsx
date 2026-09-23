import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, Check, FileUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { readWordCards, rateWordCard, saveWordCards, deleteWordCards } from './vocabStorage.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

function parseVocabLines(lines) {
  const words = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const separated = line.match(/^(.{1,48}?)\s*(?:[—–:：=]|\s-\s)\s*(.{1,160})$/);
    const koreanAt = line.search(/[가-힣]/);
    let word = separated?.[1] || (koreanAt > 0 ? line.slice(0, koreanAt) : '');
    let meaning = separated?.[2] || (koreanAt > 0 ? line.slice(koreanAt) : '');
    word = word.replace(/^[\d.)\s•·-]+/, '').replace(/[:：—–-]+\s*$/, '').trim();
    meaning = meaning.replace(/^[\s:：—–-]+/, '').trim();
    const latinLetters = word.match(/[A-Za-z]/g)?.length || 0;
    const hasKoreanTerm = /[가-힣]/.test(word);
    if ((!hasKoreanTerm && latinLetters < 2) || word.length > 48 || word.split(/\s+/).length > 6 || !meaning || meaning.length > 160 || !/[가-힣]/.test(meaning)) continue;
    if (!words.some((item) => item.word.toLowerCase() === word.toLowerCase())) words.push({ word, meaning });
  }
  return words;
}

async function extractCandidates(file) {
  if (file.size > 30 * 1024 * 1024) throw new Error('PDF는 30MB 이하 파일을 선택해 주세요.');
  const task = pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error('100쪽 이하 PDF를 지원해요.');
    const lines = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const rows = [];
      for (const item of content.items) {
        if (!item.str?.trim()) continue;
        const x = item.transform?.[4] || 0;
        const y = item.transform?.[5] || 0;
        let row = rows.find((entry) => Math.abs(entry.y - y) < 3);
        if (!row) { row = { y, items: [] }; rows.push(row); }
        row.items.push({ x, width: item.width || 0, text: item.str.trim() });
      }
      rows.sort((a, b) => b.y - a.y).forEach((row) => {
        const parts = row.items.sort((a, b) => a.x - b.x);
        let line = '';
        let lastRight = null;
        for (const part of parts) {
          const gap = lastRight === null ? 0 : part.x - lastRight;
          line += `${line ? gap > 24 ? ' — ' : ' ' : ''}${part.text}`;
          lastRight = part.x + part.width;
        }
        if (line.trim()) lines.push(line.trim());
      });
      page.cleanup();
    }
    return parseVocabLines(lines);
  } finally { await task.destroy(); }
}

export default function VocabStudio({ subject, onBack }) {
  const [sourceName, setSourceName] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState(() => readWordCards(subject.id));
  const [studyMode, setStudyMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const dueCards = useMemo(() => cards.filter((card) => new Date(card.dueAt).getTime() <= Date.now()).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)), [cards]);
  const currentCard = dueCards[0];
  const decks = useMemo(() => [...new Set(cards.map((card) => card.sourceName))], [cards]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setMessage(''); setSourceName(file.name); setDrafts([]);
    try {
      const candidates = await extractCandidates(file);
      setDrafts(candidates.length ? candidates : [{ word: '', meaning: '' }]);
      setMessage(candidates.length ? `${candidates.length}개 후보를 찾았어요. 저장 전에 단어와 뜻을 검토해 주세요.` : '단어·뜻 짝을 자동으로 찾지 못했어요. 아래에서 직접 추가할 수 있어요.');
    } catch (error) { setMessage(error.message || 'PDF를 읽지 못했어요. 선택 가능한 텍스트가 있는지 확인해 주세요.'); }
    finally { setBusy(false); }
  }

  function updateDraft(index, field, value) { setDrafts((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item)); }
  function saveDrafts() {
    const complete = drafts.filter((item) => item.word.trim() && item.meaning.trim());
    if (!complete.length || !saveWordCards(subject.id, sourceName || '직접 만든 단어', complete)) { setMessage('단어와 뜻을 한 개 이상 입력하고 저장해 주세요.'); return; }
    setCards(readWordCards(subject.id)); setDrafts([]); setMessage(`${complete.length}개 단어를 ${subject.name} 단어장에 저장했어요.`);
  }
  function rate(rating) {
    if (!currentCard || !rateWordCard(subject.id, currentCard.id, rating)) return;
    setCards(readWordCards(subject.id)); setRevealed(false);
  }

  return <main className="vocab-shell"><header className="import-header"><button className="icon-button" onClick={studyMode ? () => setStudyMode(false) : onBack} aria-label="뒤로"><ArrowLeft size={18} /></button><div><span className="eyebrow">{subject.name} · VOCABULARY</span><h1>{studyMode ? '단어 복습' : '단어장 자료'}</h1></div></header>
    {studyMode ? <section className="vocab-study-card">{currentCard ? <><span className="eyebrow">남은 복습 {dueCards.length}개 · {currentCard.sourceName}</span><strong className="vocab-front">{currentCard.word}</strong>{revealed ? <><p className="vocab-back">{currentCard.meaning}</p><div className="vocab-rating"><button onClick={() => rate('again')}><RotateCcw size={14} /> 다시</button><button onClick={() => rate('good')}><Check size={14} /> 기억했어요</button><button onClick={() => rate('easy')}>쉬웠어요</button></div></> : <button className="button button-primary" onClick={() => setRevealed(true)}>뜻 보기</button>}</> : <><BookOpenCheck size={25} /><h2>오늘 복습할 단어가 없어요</h2><p>새 PDF를 올리면 단어를 추가할 수 있어요. 다시로 표시한 단어는 10분 뒤 복습합니다.</p><button className="button button-secondary" onClick={() => setStudyMode(false)}>단어장으로</button></>}</section> : <>
      <section className="vocab-import-card"><div><strong>단어와 뜻이 함께 있는 PDF를 올려 주세요.</strong><p>영어 단어·고전 어휘·개념어 등 과목에 관계없이 가져올 수 있어요. 선택 가능한 텍스트에서 단어와 한글 뜻 후보를 찾고, 확인·수정 후 저장합니다. 스캔 PDF는 지원하지 않습니다.</p></div><label className={`file-pick ${busy ? 'disabled' : ''}`}><input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={handleFile} /><FileUp size={15} /> {busy ? '읽는 중…' : 'PDF에서 가져오기'}</label><button className="button button-secondary vocab-manual-add" onClick={() => { setSourceName('직접 만든 단어'); setDrafts((items) => [...items, { word: '', meaning: '' }]); }}>직접 단어 추가</button>{message && <p className="vocab-message" role="status">{message}</p>}</section>
      {drafts.length > 0 && <section className="vocab-draft-section"><div className="draft-list-heading"><div><span className="eyebrow">CHECK BEFORE SAVE</span><h2>단어 후보 검토</h2></div><button className="button button-secondary add-question-button" onClick={() => setDrafts((items) => [...items, { word: '', meaning: '' }])}><Plus size={14} /> 직접 추가</button></div>{drafts.map((item, index) => <article className="vocab-draft-row" key={index}><label>단어<input value={item.word} onChange={(event) => updateDraft(index, 'word', event.target.value)} /></label><label>뜻<input value={item.meaning} onChange={(event) => updateDraft(index, 'meaning', event.target.value)} /></label><button aria-label="단어 후보 삭제" onClick={() => setDrafts((items) => items.filter((_, i) => i !== index))}><Trash2 size={14} /></button></article>)}<button className="button button-primary vocab-save-button" onClick={saveDrafts}>검토한 단어 저장</button></section>}
      <section className="vocab-library"><div className="analytics-header"><div><span className="eyebrow">MY WORDS</span><h2>내 단어장</h2></div><span className="local-save-label">{cards.length}개 · 복습 대기 {dueCards.length}개</span></div><button className="button button-primary vocab-study-start" disabled={!dueCards.length} onClick={() => { setStudyMode(true); setRevealed(false); }}>오늘 단어 복습 시작</button>{decks.length ? decks.map((deck) => <div className="vocab-deck-row" key={deck}><span><strong>{deck}</strong><small>{cards.filter((card) => card.sourceName === deck).length}개 단어</small></span><button className="saved-pdf-delete" aria-label={`${deck} 단어장 삭제`} onClick={() => { if (window.confirm(`${deck}에서 가져온 단어를 모두 삭제할까요?`)) { deleteWordCards(subject.id, deck); setCards(readWordCards(subject.id)); } }}><Trash2 size={14} /></button></div>) : <p className="analytics-empty">아직 저장된 단어가 없어요.</p>}</section>
    </>}
  </main>;
}

import { Award, Check, LockKeyhole, Sparkles, Zap } from 'lucide-react';

const RANKS = [
  { name: '아이언 III', minXp: 0, tone: 'iron' },
  { name: '아이언 II', minXp: 60, tone: 'iron' },
  { name: '아이언 I', minXp: 150, tone: 'iron' },
  { name: '브론즈 III', minXp: 270, tone: 'bronze' },
  { name: '브론즈 II', minXp: 420, tone: 'bronze' },
  { name: '브론즈 I', minXp: 600, tone: 'bronze' },
  { name: '실버 III', minXp: 810, tone: 'silver' },
  { name: '실버 II', minXp: 1050, tone: 'silver' },
  { name: '실버 I', minXp: 1320, tone: 'silver' },
  { name: '골드 III', minXp: 1620, tone: 'gold' },
  { name: '골드 II', minXp: 1950, tone: 'gold' },
  { name: '골드 I', minXp: 2310, tone: 'gold' },
  { name: '플래티넘 III', minXp: 2700, tone: 'platinum' },
  { name: '플래티넘 II', minXp: 3150, tone: 'platinum' },
  { name: '플래티넘 I', minXp: 3600, tone: 'platinum' },
  { name: '다이아몬드 III', minXp: 4200, tone: 'diamond' },
  { name: '다이아몬드 II', minXp: 4800, tone: 'diamond' },
  { name: '다이아몬드 I', minXp: 5400, tone: 'diamond' },
  { name: '마스터 III', minXp: 6600, tone: 'master' },
  { name: '마스터 II', minXp: 7800, tone: 'master' },
  { name: '마스터 I', minXp: 9000, tone: 'master' },
  { name: '그랜드마스터 III', minXp: 11000, tone: 'grandmaster' },
  { name: '그랜드마스터 II', minXp: 14000, tone: 'grandmaster' },
  { name: '그랜드마스터 I', minXp: 17000, tone: 'grandmaster' },
  { name: '챌린저', minXp: 21000, tone: 'challenger' },
];

function getAchievements(stats = {}) {
  const quest = stats.quest || {};
  const subjectMinutes = stats.subjectStudyMinutes || {};
  return [
    { name: '첫 퀘스트 완료', detail: '첫 일일 퀘스트를 마쳤어요', progress: quest.completed || 0, target: 1, icon: '✦' },
    { name: '기출 첫 도장', detail: '기출 시험지 한 회 채점 완료', progress: stats.clearedExams || 0, target: 1, icon: '✓' },
    { name: '기출 다섯 고개', detail: '기출 시험지 5회 클리어', progress: stats.clearedExams || 0, target: 5, icon: '◇' },
    { name: '기출 열 고개', detail: '기출 시험지 10회 클리어', progress: stats.clearedExams || 0, target: 10, icon: '◆' },
    { name: '기출 도장 장인', detail: '기출 시험지 30회 클리어', progress: stats.clearedExams || 0, target: 30, icon: '♛' },
    { name: '6월 모평 정복', detail: '6월 모의평가 한 회 클리어', progress: stats.clearJune || 0, target: 1, icon: '☀' },
    { name: '9월 모평 정복', detail: '9월 모의평가 한 회 클리어', progress: stats.clearSeptember || 0, target: 1, icon: '🍂' },
    { name: '수능 기출 정복', detail: '대학수학능력시험 한 회 클리어', progress: stats.clearSuneung || 0, target: 1, icon: '🎓' },
    { name: '2026 기출 풀코스', detail: '한 과목에서 2026 6월·9월·수능 모두 클리어', progress: stats.cleared2026Triple ? 1 : 0, target: 1, icon: '🏆' },
    { name: '기출 한 해 완주', detail: '한 과목의 6월·9월·수능을 한 해에 모두 클리어', progress: stats.clearedTriples || 0, target: 1, icon: '✨' },
    { name: '3일 연속 출석', detail: '3일 연속으로 공부 기록 남기기', progress: stats.bestStudyStreak || 0, target: 3, icon: '▣' },
    { name: '시작이 가장 어려운 법', detail: '1주 동안 매일 공부 기록 남기기', progress: stats.bestStudyStreak || 0, target: 7, icon: '🔥' },
    { name: '한 달의 꾸준함', detail: '30일 연속 공부 기록 남기기', progress: stats.bestStudyStreak || 0, target: 30, icon: '🗓' },
    { name: '일찍 일어나는 새가 성공하는 법', detail: '7일 연속 오전 7시 30분 이전 기상 기록', progress: stats.bestWakeStreak || 0, target: 7, icon: '☀' },
    { name: '아침을 지배하는 사람', detail: '30일 연속 오전 7시 30분 이전 기상 기록', progress: stats.bestWakeStreak || 0, target: 30, icon: '🌅' },
    { name: '퀘스트 완벽 정복', detail: '하루 기본 퀘스트 3개 완수, 5일 달성', progress: quest.fullClearDays || 0, target: 5, icon: '◆' },
    { name: '퀘스트 수집가', detail: '일일 퀘스트 25개 완료', progress: quest.completed || 0, target: 25, icon: '🎯' },
    { name: '퀘스트 마스터', detail: '일일 퀘스트 100개 완료', progress: quest.completed || 0, target: 100, icon: '👑' },
    { name: '오답을 자산으로', detail: '오답 이유와 발상을 기록한 문항 10개', progress: stats.reviewedWrongAnswers || 0, target: 10, icon: '✎' },
    { name: '오답 노트 장인', detail: '오답 이유와 발상을 기록한 문항 50개', progress: stats.reviewedWrongAnswers || 0, target: 50, icon: '📚' },
    { name: '실전 감각', detail: '실전 풀이 5회 기록', progress: stats.attempts || 0, target: 5, icon: '◎' },
    { name: '실전 베테랑', detail: '실전 풀이 20회 기록', progress: stats.attempts || 0, target: 20, icon: '🎖' },
    { name: '꾸준한 집중', detail: '누적 공부 10시간 기록', progress: stats.studyMinutes || 0, target: 600, icon: '◷', format: (value) => `${Math.floor(value / 60)}시간 ${value % 60}분` },
    { name: '백 시간의 노력', detail: '누적 공부 100시간 기록', progress: stats.studyMinutes || 0, target: 6000, icon: '⌛', format: (value) => `${Math.floor(value / 60)}시간` },
    { name: '국어 독해 체력', detail: '국어 공부 10시간 기록', progress: subjectMinutes.korean || 0, target: 600, icon: '📖', format: (value) => `${Math.floor(value / 60)}시간` },
    { name: '수학 개념 정복', detail: '수학 공부 20시간 기록', progress: subjectMinutes.math || 0, target: 1200, icon: '∑', format: (value) => `${Math.floor(value / 60)}시간` },
    { name: '영어 루틴 정착', detail: '영어 공부 10시간 기록', progress: subjectMinutes.english || 0, target: 600, icon: '🔤', format: (value) => `${Math.floor(value / 60)}시간` },
    { name: '탐구의 달인', detail: '생윤·사문 공부 합계 20시간 기록', progress: (subjectMinutes.ethics || 0) + (subjectMinutes.social || 0), target: 1200, icon: '🧭', format: (value) => `${Math.floor(value / 60)}시간` },
    { name: '정답률 70%', detail: '최소 25문항 풀이 후 누적 정답률 70% 달성', progress: stats.questions >= 25 ? stats.accuracy || 0 : 0, target: 70, icon: '％' },
    { name: '정답률 85%', detail: '최소 100문항 풀이 후 누적 정답률 85% 달성', progress: stats.questions >= 100 ? stats.accuracy || 0 : 0, target: 85, icon: '★' },
  ];
}

export default function GrowthCard({ studyMinutes = 0, questBonusXp = 0, clearBonusXp = 0, achievementStats = {} }) {
  const totalStudyMinutes = Math.max(0, Math.floor(Number(studyMinutes) || 0));
  const baseStudyXp = totalStudyMinutes;
  const questXp = Math.max(0, Math.floor(Number(questBonusXp) || 0));
  const clearXp = Math.max(0, Math.floor(Number(clearBonusXp) || 0));
  const achievementPreview = getAchievements({ ...achievementStats, studyMinutes: totalStudyMinutes });
  const achievementXp = achievementPreview.filter((badge) => badge.progress >= badge.target).length * 20;
  const streakXp = Math.min(100, Math.max(0, Number(achievementStats.bestStudyStreak) || 0) * 2);
  const accuracyXp = achievementStats.questions >= 25 ? Math.min(100, Math.max(0, Math.floor((Number(achievementStats.accuracy) || 0) / 10) * 10)) : 0;
  const totalXp = baseStudyXp + questXp + clearXp + achievementXp + streakXp + accuracyXp;
  const rankIndex = RANKS.reduce((current, rank, index) => totalXp >= rank.minXp ? index : current, 0);
  const rank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1];
  const rankProgress = nextRank ? Math.min(100, ((totalXp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100) : 100;
  const achievements = achievementPreview;
  const unlocked = achievements.filter((badge) => badge.progress >= badge.target).length;
  const nextAchievements = achievements
    .filter((badge) => badge.progress < badge.target)
    .sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
    .slice(0, 3);
  const hours = Math.floor(totalStudyMinutes / 60);
  const minutes = totalStudyMinutes % 60;

  return <div className="growth-dashboard">
    <section className={`growth-rank-hero rank-${rank.tone}`} aria-label={`현재 랭크 ${rank.name}`}>
      <div className="growth-rank-copy"><span className="growth-rank-label">CURRENT RANK</span><strong>{rank.name}</strong><span className="growth-rank-level">랭크 {rankIndex + 1} / {RANKS.length}</span></div>
      <div className="growth-rank-emblem"><Award size={38} strokeWidth={1.6} /></div>
      <div className="growth-rank-xp"><span><Zap size={15} fill="currentColor" /> {totalXp.toLocaleString()} XP</span><small>공부 {baseStudyXp} · 퀘스트 {questXp} · 기출 {clearXp} · 업적 {achievementXp} · 연속출석 {streakXp} · 정답률 {accuracyXp}</small></div>
      <div className="growth-rank-progress"><div className="growth-rank-meta"><span>RANK POINTS</span><strong>{nextRank ? `${Math.round(rankProgress)}%` : 'MAX'}</strong></div><div className="growth-progress-track" role="progressbar" aria-label={nextRank ? `${nextRank.name}까지 진행률 ${Math.round(rankProgress)}퍼센트` : '최고 랭크 달성'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(rankProgress)}><span style={{ width: `${rankProgress}%` }} /></div><div className="growth-progress-copy"><span>{rank.name}</span><strong>{nextRank ? `${(nextRank.minXp - totalXp).toLocaleString()} XP → ${nextRank.name}` : '최고 랭크 달성!'}</strong></div></div>
    </section>

    <section className="growth-rank-reward"><div><span className="eyebrow">NEXT UNLOCK</span><strong>{nextRank ? `${nextRank.name} 승급` : '챌린저 최고 랭크'}</strong><p>{nextRank ? `${(nextRank.minXp - totalXp).toLocaleString()} XP를 모으면 다음 랭크가 열려요.` : '모든 랭크를 정복했어요.'}</p></div><span className="growth-reward-chip"><Award size={15} /> {nextRank ? '새 랭크 칭호' : '최종 칭호'}</span></section>

    <section className="growth-missions"><div className="growth-section-heading"><div><span className="eyebrow">NEXT ACHIEVEMENTS</span><h2>다음 업적 미션</h2></div><span>가까운 목표부터</span></div><div className="growth-mission-grid">{nextAchievements.map((badge) => { const progress = Math.min(badge.progress, badge.target); const percent = Math.round((progress / badge.target) * 100); const shown = badge.format ? badge.format(progress) : `${progress} / ${badge.target}`; return <article className="growth-mission" key={badge.name}><div className="growth-mission-head"><span>{badge.icon}</span><small>진행 중</small></div><strong>{badge.name}</strong><p>{badge.detail}</p><div className="growth-mission-track" role="progressbar" aria-label={`${badge.name} 진행률 ${percent}%`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div><small className="growth-mission-count">{shown} · {percent}%</small></article>; })}</div></section>

    <section className="growth-rank-section"><div className="growth-section-heading"><div><span className="eyebrow">RANK ROAD</span><h2>랭크 여정</h2></div><span>{rankIndex + 1} / {RANKS.length} 달성</span></div><div className="growth-rank-road">{RANKS.map((item, index) => { const achieved = totalXp >= item.minXp; return <div key={item.name} className={`growth-rank-stop ${achieved ? 'achieved' : ''} ${index === rankIndex ? 'current' : ''}`}><span className={`growth-rank-dot rank-${item.tone}`}>{achieved ? <Check size={13} /> : <LockKeyhole size={12} />}</span><span><strong>{item.name}</strong><small>{item.minXp.toLocaleString()} XP</small></span>{index === rankIndex && <em>현재</em>}</div>; })}</div></section>

    <section className="growth-achievement-section"><div className="growth-section-heading"><div><span className="eyebrow">ACHIEVEMENTS</span><h2>업적작</h2></div><span>{unlocked} / {achievements.length} 달성</span></div><div className="growth-achievement-grid">{achievements.map((badge) => { const achieved = badge.progress >= badge.target; const shownProgress = badge.format ? badge.format(Math.min(badge.progress, badge.target)) : `${Math.min(badge.progress, badge.target)} / ${badge.target}`; return <article key={badge.name} className={`growth-badge ${achieved ? 'unlocked' : ''}`}><span className="growth-badge-icon">{achieved ? badge.icon : <LockKeyhole size={15} />}</span><div><strong>{badge.name}</strong><small>{badge.detail} · {achieved ? '달성!' : shownProgress}</small></div></article>; })}</div></section>
    <p className="growth-data-note">게임식 XP: 공부 1분 = 1 XP · 퀘스트 XP · 기출 첫 클리어 +25 XP · 업적 1개 +20 XP · 최고 연속출석 1일당 +2 XP(최대 100) · 25문항 이상 풀이 시 정답률 보너스(최대 100 XP). 감점은 없어요.</p>
  </div>;
}

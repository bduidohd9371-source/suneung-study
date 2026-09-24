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
  return [
    { name: '첫 퀘스트 완료', detail: '첫 일일 퀘스트를 마쳤어요', progress: quest.completed || 0, target: 1, icon: '✦' },
    { name: '3일 연속 출석', detail: '3일 연속으로 공부 기록 남기기', progress: stats.bestStudyStreak || 0, target: 3, icon: '▣' },
    { name: '시작이 가장 어려운 법', detail: '1주 동안 매일 공부 기록 남기기', progress: stats.bestStudyStreak || 0, target: 7, icon: '🔥' },
    { name: '일찍 일어나는 새가 성공하는 법', detail: '7일 연속 오전 7시 30분 이전 기상 기록', progress: stats.bestWakeStreak || 0, target: 7, icon: '☀' },
    { name: '퀘스트 완벽 정복', detail: '하루 기본 퀘스트 3개 완수, 5일 달성', progress: quest.fullClearDays || 0, target: 5, icon: '◆' },
    { name: '오답을 자산으로', detail: '오답 이유와 발상을 기록한 문항 10개', progress: stats.reviewedWrongAnswers || 0, target: 10, icon: '✎' },
    { name: '실전 감각', detail: '실전 풀이 5회 기록', progress: stats.attempts || 0, target: 5, icon: '◎' },
    { name: '꾸준한 집중', detail: '누적 공부 10시간 기록', progress: stats.studyMinutes || 0, target: 600, icon: '◷', format: (value) => `${Math.floor(value / 60)}시간 ${value % 60}분` },
  ];
}

export default function GrowthCard({ studyMinutes = 0, questBonusXp = 0, achievementStats = {} }) {
  const totalStudyMinutes = Math.max(0, Math.floor(Number(studyMinutes) || 0));
  const totalXp = totalStudyMinutes + Math.max(0, Math.floor(Number(questBonusXp) || 0));
  const rankIndex = RANKS.reduce((current, rank, index) => totalXp >= rank.minXp ? index : current, 0);
  const rank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1];
  const rankProgress = nextRank ? Math.min(100, ((totalXp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100) : 100;
  const achievements = getAchievements({ ...achievementStats, studyMinutes });
  const unlocked = achievements.filter((badge) => badge.progress >= badge.target).length;
  const hours = Math.floor(totalStudyMinutes / 60);
  const minutes = totalStudyMinutes % 60;

  return <div className="growth-dashboard">
    <section className={`growth-rank-hero rank-${rank.tone}`} aria-label={`현재 랭크 ${rank.name}`}>
      <div className="growth-rank-copy"><span className="growth-rank-label">CURRENT RANK</span><strong>{rank.name}</strong><span className="growth-rank-level">랭크 {rankIndex + 1} / {RANKS.length}</span></div>
      <div className="growth-rank-emblem"><Award size={38} strokeWidth={1.6} /></div>
      <div className="growth-rank-xp"><span><Zap size={15} fill="currentColor" /> {totalXp.toLocaleString()} XP</span><small>누적 공부 {hours > 0 ? `${hours}시간 ` : ''}{minutes}분 · 퀘스트 보너스 {Number(questBonusXp) || 0} XP</small></div>
      <div className="growth-rank-progress"><div className="growth-progress-track" role="progressbar" aria-label={nextRank ? `${nextRank.name}까지 진행률 ${Math.round(rankProgress)}퍼센트` : '최고 랭크 달성'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(rankProgress)}><span style={{ width: `${rankProgress}%` }} /></div><div className="growth-progress-copy"><span>{rank.name}</span><strong>{nextRank ? `${(nextRank.minXp - totalXp).toLocaleString()} XP → ${nextRank.name}` : '최고 랭크 달성!'}</strong></div></div>
    </section>

    <section className="growth-rank-section"><div className="growth-section-heading"><div><span className="eyebrow">RANK ROAD</span><h2>랭크 여정</h2></div><span>{rankIndex + 1} / {RANKS.length} 달성</span></div><div className="growth-rank-road">{RANKS.map((item, index) => { const achieved = totalXp >= item.minXp; return <div key={item.name} className={`growth-rank-stop ${achieved ? 'achieved' : ''} ${index === rankIndex ? 'current' : ''}`}><span className={`growth-rank-dot rank-${item.tone}`}>{achieved ? <Check size={13} /> : <LockKeyhole size={12} />}</span><span><strong>{item.name}</strong><small>{item.minXp.toLocaleString()} XP</small></span>{index === rankIndex && <em>현재</em>}</div>; })}</div></section>

    <section className="growth-achievement-section"><div className="growth-section-heading"><div><span className="eyebrow">ACHIEVEMENTS</span><h2>업적작</h2></div><span>{unlocked} / {achievements.length} 달성</span></div><div className="growth-achievement-grid">{achievements.map((badge) => { const achieved = badge.progress >= badge.target; const shownProgress = badge.format ? badge.format(Math.min(badge.progress, badge.target)) : `${Math.min(badge.progress, badge.target)} / ${badge.target}`; return <article key={badge.name} className={`growth-badge ${achieved ? 'unlocked' : ''}`}><span className="growth-badge-icon">{achieved ? badge.icon : <LockKeyhole size={15} />}</span><div><strong>{badge.name}</strong><small>{badge.detail} · {achieved ? '달성!' : shownProgress}</small></div></article>; })}</div></section>
    <p className="growth-data-note">공부 기록은 1분당 1 XP, 퀘스트 완료는 5 XP를 받아요. 기본 퀘스트 3개를 모두 마치면 +10 XP예요. 쉬는 날에 감점은 없어요.</p>
  </div>;
}

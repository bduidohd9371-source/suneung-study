import { Award, Check, LockKeyhole, Sparkles, Zap } from 'lucide-react';

const RANKS = [
  { name: '브론즈 III', minXp: 0, tone: 'bronze' },
  { name: '브론즈 II', minXp: 60, tone: 'bronze' },
  { name: '브론즈 I', minXp: 150, tone: 'bronze' },
  { name: '실버 III', minXp: 270, tone: 'silver' },
  { name: '실버 II', minXp: 420, tone: 'silver' },
  { name: '실버 I', minXp: 600, tone: 'silver' },
  { name: '골드 III', minXp: 810, tone: 'gold' },
  { name: '골드 II', minXp: 1050, tone: 'gold' },
  { name: '골드 I', minXp: 1320, tone: 'gold' },
  { name: '플래티넘', minXp: 1620, tone: 'platinum' },
  { name: '다이아몬드', minXp: 2310, tone: 'diamond' },
  { name: '마스터', minXp: 3300, tone: 'master' },
];

const ACHIEVEMENTS = [
  { name: '첫 시동', detail: '공부 10분 기록', xp: 10, icon: '✦' },
  { name: '첫 레벨 업', detail: '레벨 2 달성', xp: 60, icon: '⬆' },
  { name: '한 시간의 집중', detail: '누적 1시간 공부', xp: 60, icon: '◷' },
  { name: '실버 입성', detail: '실버 III 달성', xp: 270, icon: '◇' },
  { name: '꾸준한 축적', detail: '누적 10시간 공부', xp: 600, icon: '✧' },
  { name: '마스터 도전', detail: '마스터 랭크 달성', xp: 3300, icon: '♛' },
];

function getLevel(totalXp) {
  let level = 1;
  let lowerBound = 0;
  let nextBound = 60;
  while (totalXp >= nextBound) {
    level += 1;
    lowerBound = nextBound;
    nextBound += 60 + (level - 1) * 30;
  }
  const title = ['새싹', '첫걸음', '습관 수련생', '집중 탐험가', '전략가', '오답 분석가', '성장형 수험생', '수능 챌린저', '목표 돌파', '완주자'][Math.min(level - 1, 9)];
  return { level, lowerBound, nextBound, title, progress: Math.min(100, ((totalXp - lowerBound) / (nextBound - lowerBound)) * 100) };
}

export default function GrowthCard({ studyMinutes = 0 }) {
  const totalXp = Math.max(0, Math.floor(Number(studyMinutes) || 0));
  const level = getLevel(totalXp);
  const rankIndex = RANKS.reduce((current, rank, index) => totalXp >= rank.minXp ? index : current, 0);
  const rank = RANKS[rankIndex];
  const nextRank = RANKS[rankIndex + 1];
  const rankProgress = nextRank ? Math.min(100, ((totalXp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100) : 100;
  const unlocked = ACHIEVEMENTS.filter((badge) => totalXp >= badge.xp).length;
  const hours = Math.floor(totalXp / 60);
  const minutes = totalXp % 60;

  return <div className="growth-dashboard">
    <header className="growth-page-heading"><span className="eyebrow">PLAYER PROFILE</span><h1>내 성장기록</h1><p>오늘 기록한 공부가 경험치와 랭크로 쌓여요.</p></header>
    <section className={`growth-rank-hero rank-${rank.tone}`} aria-label={`현재 랭크 ${rank.name}`}>
      <div className="growth-rank-copy"><span className="growth-rank-label">CURRENT RANK</span><strong>{rank.name}</strong><span className="growth-rank-level">LV. {level.level} · {level.title}</span></div>
      <div className="growth-rank-emblem"><Award size={38} strokeWidth={1.6} /></div>
      <div className="growth-rank-xp"><span><Zap size={15} fill="currentColor" /> {totalXp.toLocaleString()} XP</span><small>누적 공부 {hours > 0 ? `${hours}시간 ` : ''}{minutes}분</small></div>
      <div className="growth-rank-progress"><div className="growth-progress-track" role="progressbar" aria-label={nextRank ? `${nextRank.name}까지 진행률 ${Math.round(rankProgress)}퍼센트` : '최고 랭크 달성'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(rankProgress)}><span style={{ width: `${rankProgress}%` }} /></div><div className="growth-progress-copy"><span>{rank.name}</span><strong>{nextRank ? `${(nextRank.minXp - totalXp).toLocaleString()} XP → ${nextRank.name}` : '최고 랭크 달성!'}</strong></div></div>
    </section>

    <section className="growth-level-panel"><div className="growth-level-top"><span className="growth-level-icon"><Sparkles size={19} /></span><div><span className="eyebrow">LEVEL PROGRESS</span><h2>레벨 {level.level} · {level.title}</h2></div><strong>{totalXp.toLocaleString()} <small>XP</small></strong></div><div className="growth-progress-track" role="progressbar" aria-label={`다음 레벨까지 ${Math.round(level.progress)}퍼센트`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(level.progress)}><span style={{ width: `${level.progress}%` }} /></div><div className="growth-progress-copy"><span>현재 레벨 시작 {level.lowerBound} XP</span><strong>{(level.nextBound - totalXp).toLocaleString()} XP 후 레벨 업</strong></div><p className="growth-xp-rule"><Zap size={13} /> 공부 1분 기록 = 1 XP <span>쉬는 날이나 기록을 놓친 날에 감점은 없어요.</span></p></section>

    <section className="growth-rank-section"><div className="growth-section-heading"><div><span className="eyebrow">RANK ROAD</span><h2>랭크 여정</h2></div><span>{rankIndex + 1} / {RANKS.length} 달성</span></div><div className="growth-rank-road">{RANKS.map((item, index) => { const achieved = totalXp >= item.minXp; return <div key={item.name} className={`growth-rank-stop ${achieved ? 'achieved' : ''} ${index === rankIndex ? 'current' : ''}`}><span className={`growth-rank-dot rank-${item.tone}`}>{achieved ? <Check size={13} /> : <LockKeyhole size={12} />}</span><span><strong>{item.name}</strong><small>{item.minXp.toLocaleString()} XP</small></span>{index === rankIndex && <em>현재</em>}</div>; })}</div></section>

    <section className="growth-achievement-section"><div className="growth-section-heading"><div><span className="eyebrow">ACHIEVEMENTS</span><h2>달성 배지</h2></div><span>{unlocked} / {ACHIEVEMENTS.length}</span></div><div className="growth-achievement-grid">{ACHIEVEMENTS.map((badge) => { const achieved = totalXp >= badge.xp; return <article key={badge.name} className={`growth-badge ${achieved ? 'unlocked' : ''}`}><span className="growth-badge-icon">{achieved ? badge.icon : <LockKeyhole size={15} />}</span><div><strong>{badge.name}</strong><small>{achieved ? badge.detail : `${(badge.xp - totalXp).toLocaleString()} XP 더 모으면 달성`}</small></div></article>; })}</div></section>
    <p className="growth-data-note">랭크와 배지는 이 기기에 기록된 공부 시간으로 계산돼요. 공부 기록이 쌓이면 자동으로 갱신됩니다.</p>
  </div>;
}

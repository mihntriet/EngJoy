import React from 'react';
import { Link } from 'react-router-dom';
import { RARITY, LOL_ICONS } from '../constants/gameData';
import ItemIcon from '../components/common/ItemIcon';
import Bar from '../components/common/Bar';
import LoLIcon from '../components/common/LoLIcon';
import { useProgressStore } from '../context/progressStore';
import { useAuthStore } from '../context/authStore';

const YASUO_SPLASH = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg';

const actions = [
  { id: 'codex', label: 'Codex', note: 'Tra từ & ghi nhớ', icon: 'shield' },
  { id: 'arena', label: 'Arena', note: 'Thử thách kỹ năng', icon: 'streak' },
  { id: 'inventory', label: 'Armory', note: 'Trang bị & vật phẩm', icon: 'potion' },
];

export default function Dashboard({ user, items, missions, onNav }) {
  const { isAuthenticated } = useAuthStore();
  const { quests, questUnits } = useProgressStore();
  const quest = quests?.find((item) => item.status === 'active') || quests?.[0] || { id: 1, label: 'A1', name: 'Vùng đất khởi đầu', champion: 'Ashe', done: 0, units: 8 };
  const units = questUnits?.[quest.id] || [];
  const unit = units.find((item) => item.status === 'active') || units[0] || { id: 1, title: 'Bảng chữ cái & Phát âm', words: 25 };
  const equipped = items.filter((item) => (user.equippedIds || []).some((id) => String(id) === String(item.id)));
  const xp = user.xp || 0;
  const questPct = quest.units ? Math.round(((quest.done || 0) / quest.units) * 100) : 0;
  const completed = missions.filter((mission) => mission.done_flag || mission.done >= mission.total).length;

  return (
    <main className="premium-dashboard">
      <header className="premium-dashboard-header">
        <div><p>ENGJOY ACADEMY · SEASON I</p><h2>Campaign Chamber</h2></div>
        <div className="premium-rank"><span>Scholar rank</span><strong>LVL {user.level}</strong></div>
      </header>

      <div className="premium-asymmetric-grid">
        <section className="premium-hero asymmetric-hero premium-hero-link" aria-labelledby="next-quest-title" role="link" tabIndex={0} onClick={() => onNav('learn')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNav('learn'); } }}>
          <img className="premium-hero-art" src={YASUO_SPLASH} alt="" />
          <div className="premium-hero-shade" />
          <div className="premium-quest">
            <p className="premium-eyebrow">Active quest · {quest.label} / Unit {unit.id}</p>
            <h1 id="next-quest-title">{unit.title}</h1>
            <p className="premium-hero-copy">Một bước nhỏ trên hành trình chinh phục tiếng Anh.</p>
            <div className="premium-quest-actions">
              <div className="premium-rewards"><span><b>+60</b> XP</span><span><b>+{unit.words || 15}</b> TỪ MỚI</span></div>
            </div>
          </div>
        </section>

        <section className="premium-stats asymmetric-stats" aria-label="Player statistics">
          {[['XP', user.totalXp ?? xp, LOL_ICONS.xp, 'gold'], ['WORDS', user.wordsLearned || 0, LOL_ICONS.shield, 'purple'], ['STREAK', `${user.streak || 0}d`, LOL_ICONS.streak, 'cyan'], ['GOLD', user.gold?.toLocaleString?.() || 0, LOL_ICONS.gold, 'gold']].map(([label, value, icon, tone]) => (
            <div className={`premium-stat tone-${tone}`} key={label}><div><LoLIcon src={icon} size={20} /></div><p>{label}</p><strong>{value}</strong></div>
          ))}
        </section>

        <section className="premium-panel premium-bounties asymmetric-bounties" aria-labelledby="bounties-title">
          <div className="premium-panel-heading"><div><p>Today’s board</p><h3 id="bounties-title">Daily Bounties</h3></div><span>{completed}/{missions.length} claimed</span></div>
          <div className="premium-bounty-list">
            {missions.map((mission, index) => {
              const done = mission.done_flag || mission.done >= mission.total;
              const pct = Math.min(100, Math.round((mission.done / mission.total) * 100));
              return <article className={`premium-bounty ${done ? 'is-done' : ''}`} key={mission.id}>
                <div className="premium-bounty-index">{done ? '✓' : String(index + 1).padStart(2, '0')}</div>
                <div className="premium-bounty-content"><div><h4>{mission.title}</h4><small>{done ? 'Bounty claimed' : `${mission.done}/${mission.total} complete`}</small></div><Bar pct={pct} color={done ? 'var(--green)' : 'var(--purple)'} height={4} glow={!done && pct > 0} /></div>
                <strong>+{mission.xp}<small>XP</small></strong>
              </article>;
            })}
          </div>
        </section>

        <section className="premium-panel premium-map asymmetric-map">
          <div className="premium-panel-heading"><div><p>Expedition map</p><h3>{quest.label} · {quest.name}</h3></div><button type="button" onClick={() => onNav('learn')}>OPEN ↗</button></div>
          <div className="premium-map-track">{Array.from({ length: Math.min(quest.units || 1, 8) }, (_, index) => <i key={index} className={units[index]?.status || (index === unit.id - 1 ? 'active' : 'locked')} />)}</div>
          <p><b>{quest.done || 0}/{quest.units}</b> units conquered · {questPct}% explored</p>
        </section>

        <section className="premium-panel premium-armory asymmetric-armory">
          <div className="premium-panel-heading"><div><p>Equipped artifacts</p><h3>Armory</h3></div><button type="button" onClick={() => onNav('inventory')}>OPEN ↗</button></div>
          <div className="premium-artifacts" style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 'none' }}>{[0, 1].map((slot) => {
            const item = equipped[slot];
            const rarity = item ? (RARITY[item.rarity] || RARITY.common) : null;
            const slotStyle = { display: 'flex', alignItems: 'center', gap: 10, minHeight: 78, padding: 11, background: 'rgba(3, 7, 18, .72)', border: '1px solid rgba(71, 85, 105, .55)', boxShadow: 'inset 0 0 14px rgba(0, 0, 0, .28)', textAlign: 'left' };
            const iconFrameStyle = { display: 'grid', placeItems: 'center', flex: '0 0 50px', width: 50, height: 50, background: 'rgba(15, 23, 42, .9)', border: '1px solid rgba(148, 163, 184, .35)', boxShadow: item ? `0 0 10px ${rarity.border}55` : 'none' };
            return item ? <div className="premium-artifact" style={{ ...slotStyle, '--artifact': rarity.border }} key={item.id}><span style={iconFrameStyle}><ItemIcon id={item.lolItem} size={42} /></span><span><b>{item.name}</b><small>{item.effect}</small></span></div> : <button className="premium-artifact empty" style={{ ...slotStyle, borderStyle: 'dashed', cursor: 'pointer' }} type="button" onClick={() => onNav('inventory')} key={slot}><b style={{ display: 'grid', placeItems: 'center', flex: '0 0 50px', width: 50, height: 50, margin: 0, background: 'rgba(15, 23, 42, .62)', border: '1px solid rgba(71, 85, 105, .45)' }}>◇</b><span><strong>Empty slot</strong><small>Find an artifact</small></span></button>;
          })}</div>
        </section>
      </div>

      <section className="premium-footer-row">{!isAuthenticated && <div className="premium-guest"><div><p>GUEST EXPEDITION</p><strong>Đừng để hành trình bị bỏ quên.</strong><span>Đăng ký để lưu XP, bounties và artifacts.</span></div><Link to="/register">SECURE PROGRESS ↗</Link></div>}<nav className="premium-actions" aria-label="Quick navigation">{actions.map((action) => <button type="button" onClick={() => onNav(action.id)} key={action.id}><LoLIcon src={LOL_ICONS[action.icon]} size={17} /><span><b>{action.label}</b><small>{action.note}</small></span><i aria-hidden="true">↗</i></button>)}</nav></section>
    </main>
  );
}

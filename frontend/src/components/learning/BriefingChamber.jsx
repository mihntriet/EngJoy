import { useState } from 'react';

function RuneGlyph() {
  return <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }} aria-hidden="true">
    <div className="absolute inset-0 anim-rotate-slow" style={{ border: '1px solid rgba(0, 240, 255, 0.3)', transform: 'rotate(45deg)', boxShadow: '0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 20px rgba(0, 240, 255, 0.1)' }} />
    <div className="absolute anim-pulse-glow" style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #083344 0%, #0B0F19 100%)', border: '1px solid #00F0FF', transform: 'rotate(45deg)' }} />
    <span className="relative z-10 text-glow-cyan" style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700, color: '#00F0FF' }}>Ω</span>
  </div>;
}

function SealBadge({ label }) {
  return <div style={{ padding: '5px 14px', border: '1px solid #083344', background: 'rgba(0, 240, 255, 0.05)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#22D3EE', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</div>;
}

function LockedWordCard({ name }) {
  return <div style={{ padding: '12px 16px', border: '1px solid #1E293B', background: 'rgba(11, 15, 25, 0.6)', display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 28, height: 28, border: '1px solid #1E293B', background: '#111827', display: 'grid', placeItems: 'center', color: '#94A3B8' }} aria-hidden="true">▣</div>
    <span className="truncate" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#94A3B8', letterSpacing: '0.05em' }}>{name}</span>
  </div>;
}

export default function BriefingChamber({ lesson, vocabulary = [], questions = [], onStart, onRetreat, loading = false, error = '', onRetry }) {
  const [hoverRetreat, setHoverRetreat] = useState(false);
  const [hoverCta, setHoverCta] = useState(false);
  const wordCards = vocabulary.slice(0, 4);

  return <section className="runic-briefing anim-fade-in-up" aria-labelledby="briefing-title">
    <div className="runic-ambient" />
    <header className="runic-briefing-hud">
      <button type="button" className="chamfer-retreat" onMouseEnter={() => setHoverRetreat(true)} onMouseLeave={() => setHoverRetreat(false)} onClick={onRetreat} style={{ color: hoverRetreat ? '#EF4444' : '#94A3B8', boxShadow: hoverRetreat ? '0 0 16px rgba(239, 68, 68, 0.3)' : 'none', outlineColor: hoverRetreat ? '#EF4444' : '#1E293B' }}><span aria-hidden="true">‹</span> RÚT LUI</button>
      <span>EXPEDITION PROTOCOL // REALM A1-{String(lesson?.id || 1).padStart(2, '0')}</span>
    </header>

    <main className="runic-briefing-stage">
      <div className="runic-briefing-lore">
        <RuneGlyph />
        <div><h1 id="briefing-title">{lesson?.title}</h1><p>{lesson?.intro}</p></div>
        <div className="runic-seal-tags"><SealBadge label={`${vocabulary.length} KÝ TỰ`} /><SealBadge label={`${questions.length} CỔ NGỮ`} /><SealBadge label="60% ĐIỂM CHUẨN" /></div>
      </div>
      <aside className="glass-dark chamfer-card runic-intel">
        <div className="runic-intel-title"><i /> TARGET INTEL &amp; BOUNTY</div>
        <div className="runic-rewards"><div><small>TARGET XP</small><strong>+60</strong></div><div><small>TARGET GOLD</small><strong>+25</strong></div></div>
        <div className="runic-seals"><small>ENCRYPTED SEALS // {vocabulary.length} RUNES</small><div>{wordCards.map((word, index) => <LockedWordCard key={word.id || index} name={word.word} />)}</div></div>
      </aside>
    </main>

    <footer className="runic-briefing-footer">
      <button type="button" className="chamfer-btn" disabled={loading || Boolean(error)} onMouseEnter={() => setHoverCta(true)} onMouseLeave={() => setHoverCta(false)} onClick={onStart} style={{ background: hoverCta ? 'linear-gradient(90deg, #E08010 0%, #FBBF24 50%, #C46000 100%)' : 'linear-gradient(90deg, #D97706 0%, #F59E0B 50%, #B45309 100%)', boxShadow: hoverCta ? '0 0 50px rgba(245, 158, 11, 0.65), 0 0 100px rgba(245, 158, 11, 0.2)' : '0 0 30px rgba(245, 158, 11, 0.45)' }}>{loading ? 'ĐANG CHUẨN BỊ ẢI...' : 'KHAI MỞ TRẬN CHIẾN'}</button>
      {error && <div className="runic-briefing-error"><span>{error}</span><button type="button" onClick={onRetry}>Thử lại</button></div>}
    </footer>
  </section>;
}

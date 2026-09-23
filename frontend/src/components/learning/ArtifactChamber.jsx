import { useState } from 'react';

const WaveformIcon = ({ active }) => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
    <rect x="0" y="5" width="2" height="4" fill={active ? '#00F0FF' : '#94A3B8'} />
    <rect x="3" y="2" width="2" height="10" fill={active ? '#00F0FF' : '#94A3B8'} />
    <rect x="6" y="0" width="2" height="14" fill={active ? '#00F0FF' : '#94A3B8'} />
    <rect x="9" y="3" width="2" height="8" fill={active ? '#00F0FF' : '#94A3B8'} />
    <rect x="12" y="5" width="2" height="4" fill={active ? '#00F0FF' : '#94A3B8'} />
    <rect x="15" y="6" width="2" height="2" fill={active ? '#00F0FF' : '#94A3B8'} />
  </svg>
);

const ConcenticRunes = () => (
  <svg
    width="600"
    height="600"
    viewBox="0 0 600 600"
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: 0.06,
      pointerEvents: 'none',
    }}
  >
    <circle cx="300" cy="300" r="250" stroke="#00F0FF" strokeWidth="1" fill="none" />
    <circle cx="300" cy="300" r="200" stroke="#00F0FF" strokeWidth="0.5" fill="none" />
    <circle cx="300" cy="300" r="150" stroke="#00F0FF" strokeWidth="1" fill="none" />
    <circle cx="300" cy="300" r="100" stroke="#22D3EE" strokeWidth="0.5" fill="none" />
    <line x1="50" y1="300" x2="550" y2="300" stroke="#00F0FF" strokeWidth="0.5" />
    <line x1="300" y1="50" x2="300" y2="550" stroke="#00F0FF" strokeWidth="0.5" />
    <line x1="123" y1="123" x2="477" y2="477" stroke="#00F0FF" strokeWidth="0.5" />
    <line x1="477" y1="123" x2="123" y2="477" stroke="#00F0FF" strokeWidth="0.5" />
    <polygon points="300,120 420,420 180,420" stroke="#22D3EE" strokeWidth="0.5" fill="none" />
    <polygon points="300,480 180,180 420,180" stroke="#22D3EE" strokeWidth="0.5" fill="none" />
  </svg>
);

export default function ArtifactChamber({ word, currentIndex, totalWords, onAbsorb, onRetreat }) {
  const [audioActive, setAudioActive] = useState(false);
  const [hoverAbsorb, setHoverAbsorb] = useState(false);
  const [ripples, setRipples] = useState([]);

  const handleAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(word?.word || ''));
    }
    setAudioActive(true);
    const id = Date.now();
    setRipples((prev) => [...prev, id]);
    setTimeout(() => {
      setAudioActive(false);
      setRipples((prev) => prev.filter((r) => r !== id));
    }, 1200);
  };

  return (
    <div
      className="anim-fade-in-up"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#030712',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background radial */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, rgba(8, 51, 68, 0.20) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Concentric rune decorations */}
      <ConcenticRunes />

      {/* ─── TOP: Progress Bar ─── */}
      <div style={{
        width: '100%',
        height: 4,
        display: 'flex',
        gap: 3,
        flexShrink: 0,
        position: 'relative',
        zIndex: 2,
      }}>
        {Array.from({ length: totalWords }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              background: i <= currentIndex
                ? '#00F0FF'
                : 'rgba(30, 41, 59, 0.8)',
              boxShadow: i <= currentIndex ? '0 0 8px rgba(0, 240, 255, 0.8)' : 'none',
              transition: 'all 0.4s ease',
            }}
          />
        ))}
      </div>

      {/* Retreat trigger */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 48,
        zIndex: 3,
      }}>
        <button
          className="chamfer-retreat"
          onClick={onRetreat}
          style={{
            width: 120,
            height: 36,
            background: '#111827',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#94A3B8',
            outline: '1px solid #1E293B',
            outlineOffset: '-1px',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L2 5l4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
          RÚT LUI
        </button>
      </div>

      {/* ─── THE LEVITATION MONOLITH ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 900,
        width: '100%',
        gap: 0,
        position: 'relative',
        zIndex: 2,
        padding: '60px 40px 0',
      }}>
        {/* Category micro-badge */}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: '#22D3EE',
          letterSpacing: '0.15em',
          marginBottom: 28,
          textTransform: 'uppercase',
        }}>
          ANCIENT LEXICON // RUNIC ARTIFACT
        </div>

        {/* The Word */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <h1
            className="text-glow-white"
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '0.02em',
              margin: 0,
              lineHeight: 1.1,
              textAlign: 'center',
              wordBreak: 'break-word',
            }}
          >
            {word?.word}
          </h1>
        </div>

        {/* Phonetic Capsule */}
        <div style={{ position: 'relative', marginTop: 28 }}>
          {/* Ripple effects */}
          {ripples.map((id) => (
            <div
              key={id}
              style={{
                position: 'absolute',
                inset: -8,
                border: '1px solid rgba(0, 240, 255, 0.5)',
                borderRadius: 0,
                animation: 'ripple-expand 1.2s ease-out forwards',
                pointerEvents: 'none',
              }}
            />
          ))}

          <button
            onClick={handleAudio}
            style={{
              minWidth: 240,
              padding: '0 20px',
              height: 42,
              background: audioActive ? 'rgba(0, 240, 255, 0.1)' : '#111827',
              border: `1px solid ${audioActive ? '#00F0FF' : '#1E293B'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: audioActive ? '0 0 20px rgba(0, 240, 255, 0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <WaveformIcon active={audioActive} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13,
              color: audioActive ? '#00F0FF' : '#94A3B8',
              letterSpacing: '0.04em',
              fontStyle: 'italic',
            }}>
              {word?.phonetic || '/.../'}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: audioActive ? '#00F0FF' : '#083344',
              background: audioActive ? 'transparent' : '#083344',
              padding: '2px 6px',
              letterSpacing: '0.06em',
            }}>
              PHÁT ÂM
            </span>
          </button>
        </div>

        {/* Semantic Meaning Panel */}
        <div
          className="glass-medium"
          style={{
            width: 640,
            maxWidth: '100%',
            marginTop: 36,
            padding: '24px 32px',
            border: '1px solid #083344',
            borderTop: '2px solid #00F0FF',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.05)',
            textAlign: 'center',
          }}
        >
          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 20,
            color: '#E2E8F0',
            margin: '0 0 8px',
            lineHeight: 1.5,
          }}>
            {word?.meaning}
          </p>
          {word?.example && (
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              color: '#94A3B8',
              margin: 0,
              fontStyle: 'italic',
            }}>
              "{word?.example}"
            </p>
          )}
        </div>
      </div>

      {/* ─── ABSORB BUTTON ─── */}
      <div style={{
        width: '100%',
        maxWidth: 640,
        padding: '32px 20px 48px',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 2,
      }}>
        <button
          className="chamfer-absorb"
          onMouseEnter={() => setHoverAbsorb(true)}
          onMouseLeave={() => setHoverAbsorb(false)}
          onClick={onAbsorb}
          style={{
            width: '100%',
            height: 60,
            border: 'none',
            cursor: 'pointer',
            background: hoverAbsorb
              ? 'linear-gradient(90deg, #E08010 0%, #FBBF24 50%, #C46000 100%)'
              : 'linear-gradient(90deg, #D97706 0%, #F59E0B 50%, #B45309 100%)',
            fontFamily: 'Inter, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#FFFFFF',
            textTransform: 'uppercase',
            boxShadow: hoverAbsorb
              ? '0 0 45px rgba(245, 158, 11, 0.65)'
              : '0 0 25px rgba(245, 158, 11, 0.4)',
            transform: hoverAbsorb ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s ease',
          }}
        >
          {currentIndex < totalWords - 1 ? 'ABSORB MEMORY // THẤM NHUẦN' : 'ENGAGE COMBAT // TIẾN VÀO TRẬN CHIẾN'}
        </button>
      </div>
    </div>
  );
}

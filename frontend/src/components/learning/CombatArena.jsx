import { useState, useEffect, useRef } from 'react';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

function CombatOption({ label, text, state, onClick, disabled }) {
  const [hovered, setHovered] = useState(false);

  const borderColor =
    state === 'correct' ? '#F59E0B' :
    state === 'wrong' ? '#EF4444' :
    state === 'selected' ? '#22D3EE' :
    hovered ? '#00F0FF' :
    '#1E293B';

  const glow =
    state === 'correct' ? '0 0 28px rgba(245, 158, 11, 0.6)' :
    state === 'wrong' ? '0 0 24px rgba(239, 68, 68, 0.5)' :
    state === 'selected' ? '0 0 24px rgba(34, 211, 238, 0.5)' :
    hovered ? '0 0 20px rgba(0, 240, 255, 0.3)' :
    'none';

  const bg =
    state === 'correct' ? 'rgba(245, 158, 11, 0.08)' :
    state === 'wrong' ? 'rgba(239, 68, 68, 0.08)' :
    state === 'selected' ? 'rgba(34, 211, 238, 0.08)' :
    hovered ? 'linear-gradient(135deg, rgba(8, 51, 68, 0.8) 0%, rgba(11, 15, 25, 0.9) 100%)' :
    'rgba(11, 15, 25, 0.85)';

  const keyBg =
    state === 'correct' ? '#F59E0B' :
    state === 'wrong' ? '#EF4444' :
    state === 'selected' ? '#22D3EE' :
    hovered ? '#00F0FF' :
    '#111827';

  const keyColor =
    (state === 'correct' || state === 'wrong' || state === 'selected' || hovered) ? '#030712' : '#22D3EE';

  return (
    <button
      type="button"
      className={`chamfer-card ${state === 'wrong' ? 'anim-shake' : ''}`}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: 84,
        background: bg,
        border: 'none',
        outline: `${state !== 'idle' ? 2 : hovered ? 1.5 : 1}px solid ${borderColor}`,
        outlineOffset: '-1px',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '0 28px',
        boxShadow: [glow, 'inset 0 1px 0 rgba(255,255,255,0.08)'].filter(Boolean).join(', '),
        transform: hovered && !disabled ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        flexShrink: 0,
        background: keyBg,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        fontWeight: 700,
        color: keyColor,
        transition: 'all 0.18s ease',
        boxShadow: hovered && !disabled ? '0 0 12px rgba(0, 240, 255, 0.4)' : 'none',
      }}>
        {label}
      </div>
      <span style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 18,
        fontWeight: 500,
        color: state === 'correct' ? '#FBBF24' : state === 'wrong' ? '#EF4444' : state === 'selected' ? '#22D3EE' : '#E2E8F0',
        textAlign: 'left',
        transition: 'color 0.18s ease',
      }}>
        {text}
      </span>
      {state === 'correct' && (
        <div style={{ marginLeft: 'auto', color: '#FBBF24', fontSize: 20 }}>✓</div>
      )}
      {state === 'wrong' && (
        <div style={{ marginLeft: 'auto', color: '#EF4444', fontSize: 20 }}>✗</div>
      )}
      {state === 'selected' && (
        <div style={{ marginLeft: 'auto', color: '#22D3EE', fontSize: 20 }}>●</div>
      )}
    </button>
  );
}

export default function CombatArena({ questions = [], onComplete, onRetreat }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [cardStates, setCardStates] = useState(['idle', 'idle', 'idle', 'idle']);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(15);
  const [floatingLabels, setFloatingLabels] = useState([]);
  const [bossHpDefeated, setBossHpDefeated] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [answers, setAnswers] = useState([]);
  const answersRef = useRef([]);
  const timerRef = useRef(null);
  const labelIdRef = useRef(0);

  const q = questions[currentQ];
  const isTimerCritical = timer <= 5;
  const isLocalQuestion = q?.answer !== undefined;

  useEffect(() => {
    if (selected !== null || !q) return;
    setTimer(15);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ, selected, q]);

  function handleTimeout() {
    setStreak(0);
    const newStates = (q.options || []).map(() => 'idle');
    setCardStates(newStates);
    setSelected(-1);
    
    const newAnswer = {
      questionId: q.id,
      selected: -1,
      ...(isLocalQuestion ? { isCorrect: false } : {})
    };
    
    setAnswers(prev => [...prev, newAnswer]);
    answersRef.current.push(newAnswer);

    setBossHpDefeated((prev) => prev + 1);
    scheduleNextQ();
  }

  function addFloatingLabel(text, type) {
    const id = ++labelIdRef.current;
    setFloatingLabels((prev) => [...prev, {
      id, text, type,
      x: 50 + (Math.random() - 0.5) * 30,
      y: 40 + (Math.random() - 0.5) * 10,
    }]);
    setTimeout(() => {
      setFloatingLabels((prev) => prev.filter((l) => l.id !== id));
    }, 800);
  }

  function handleSelect(index) {
    if (selected !== null || transitioning) return;
    clearInterval(timerRef.current);
    setSelected(index);

    const correct = isLocalQuestion && index === q.answer;
    
    const newAnswer = {
      questionId: q.id,
      selected: index,
      ...(isLocalQuestion ? { isCorrect: correct } : {})
    };
    
    setAnswers(prev => [...prev, newAnswer]);
    answersRef.current.push(newAnswer);

    const newStates = (q.options || []).map((_, i) => {
      if (i === index) {
        if (isLocalQuestion) return correct ? 'correct' : 'wrong';
        return 'selected';
      }
      return 'idle';
    });
    setCardStates(newStates);

    if (isLocalQuestion) {
      if (correct) {
        setStreak((s) => s + 1);
        addFloatingLabel(`+100 DAMAGE`, 'damage');
      } else {
        setStreak(0);
        addFloatingLabel('MISS', 'miss');
      }
    } else {
      addFloatingLabel('ATTACK!', 'damage');
    }

    setBossHpDefeated((prev) => prev + 1);
    scheduleNextQ();
  }

  function scheduleNextQ() {
    setTransitioning(true);
    setTimeout(() => {
      const next = currentQ + 1;
      if (next >= questions.length) {
        // Calculate score
        const currentAnswers = answersRef.current;
        const score = questions.length
          ? Math.round((currentAnswers.filter(a => a.isCorrect).length / questions.length) * 100)
          : 0;
        onComplete(currentAnswers, score);
      } else {
        setCurrentQ(next);
        setSelected(null);
        setCardStates(['idle', 'idle', 'idle', 'idle']);
        setTransitioning(false);
      }
    }, 1600);
  }

  if (!q) return null;

  return (
    <div
      className="anim-fade-in-up"
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#030712',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid lines */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(8, 51, 68, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(8, 51, 68, 0.08) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 20%, rgba(8, 51, 68, 0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* ─── TOP HUD ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
        position: 'relative',
        zIndex: 2,
        flexShrink: 0,
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
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L2 5l4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
          </svg>
          RÚT LUI
        </button>

        <div style={{
          flex: 1,
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: '#22D3EE',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            GUARDIAN VITALS // KẾT GIỚI BẢO VỆ
          </span>
          <div style={{
            width: '100%',
            height: 10,
            background: '#111827',
            border: '1px solid #1E293B',
            display: 'flex',
            gap: 3,
            padding: 2,
          }}>
            {questions.map((_, i) => {
              const defeated = bossHpDefeated > i;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: defeated
                      ? '#111827'
                      : 'linear-gradient(90deg, #00F0FF, #22D3EE)',
                    boxShadow: defeated ? 'none' : '0 0 6px rgba(0, 240, 255, 0.6)',
                    transition: 'all 0.4s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {defeated && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'repeating-linear-gradient(45deg, rgba(30,41,59,0.4) 0px, rgba(30,41,59,0.4) 2px, transparent 2px, transparent 6px)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 14,
              fontWeight: 700,
              color: '#FBBF24',
              textShadow: '0 0 12px rgba(251, 191, 36, 0.6)',
              letterSpacing: '0.08em',
            }}>
              STREAK: {streak}X
            </span>
          </div>

          <div
            className={isTimerCritical ? 'anim-timer-pulse' : ''}
            style={{
              padding: '6px 14px',
              border: `2px solid ${isTimerCritical ? '#EF4444' : '#1E293B'}`,
              background: isTimerCritical ? 'rgba(239, 68, 68, 0.1)' : '#111827',
              boxShadow: isTimerCritical ? '0 0 16px rgba(239, 68, 68, 0.4)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.3s ease',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke={isTimerCritical ? '#EF4444' : '#94A3B8'} strokeWidth="1"/>
              <path d="M6 3v3l2 1.5" stroke={isTimerCritical ? '#EF4444' : '#94A3B8'} strokeWidth="1" strokeLinecap="square"/>
            </svg>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 16,
              fontWeight: 700,
              color: isTimerCritical ? '#EF4444' : '#E2E8F0',
              letterSpacing: '0.05em',
              minWidth: 36,
            }}>
              {String(timer).padStart(2, '0')}s
            </span>
          </div>
        </div>
      </div>

      {/* ─── QUESTION MONOLITH ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 1080,
        width: '100%',
        margin: '0 auto',
        position: 'relative',
        zIndex: 2,
      }}>
        {floatingLabels.map((label) => (
          <div
            key={label.id}
            style={{
              position: 'absolute',
              top: `${label.y}%`,
              left: `${label.x}%`,
              transform: 'translateX(-50%)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: label.type === 'damage' ? 20 : 16,
              fontWeight: 700,
              color: label.type === 'damage' ? '#FBBF24' : '#EF4444',
              textShadow: label.type === 'damage'
                ? '0 0 20px rgba(251, 191, 36, 0.8)'
                : '0 0 20px rgba(239, 68, 68, 0.8)',
              letterSpacing: '0.1em',
              pointerEvents: 'none',
              zIndex: 10,
              animation: 'float-up 0.8s ease-out forwards',
            }}
          >
            {label.text}
          </div>
        ))}

        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          color: '#F59E0B',
          letterSpacing: '0.12em',
          marginBottom: 24,
          textShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
        }}>
          TACTICAL RIDDLE // {String(currentQ + 1).padStart(2, '0')} OF {String(questions.length).padStart(2, '0')}
        </div>

        <div style={{
          width: '100%',
          borderTop: '1px solid #083344',
          borderBottom: '1px solid #083344',
          padding: '32px 24px',
          textAlign: 'center',
          position: 'relative',
          marginBottom: 0,
        }}>
          <div style={{
            position: 'absolute',
            top: -1,
            left: '10%',
            width: '80%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.4), transparent)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -1,
            left: '10%',
            width: '80%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.4), transparent)',
          }} />
          <p style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(22px, 3vw, 38px)',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: '140%',
            margin: 0,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)',
          }}>
            {q.prompt || q.question}
          </p>
        </div>
      </div>

      {/* ─── COMMAND DECK ─── */}
      <div style={{
        width: '100%',
        maxWidth: 1160,
        margin: '0 auto',
        position: 'relative',
        zIndex: 2,
        marginBottom: 24,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 20,
          rowGap: 16,
        }}>
          {(q.options || []).map((opt, i) => (
            <CombatOption
              key={`${currentQ}-${i}`}
              label={OPTION_KEYS[i]}
              text={opt}
              state={cardStates[i]}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

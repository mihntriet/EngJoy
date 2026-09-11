import React, { useState, useRef, useEffect } from 'react';
import { ARENA_GAMES, INITIAL_ITEMS, QUIZ_Q, splash } from '../constants/gameData';
import { useProgressStore } from '../context/progressStore';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';
import ItemIcon from '../components/common/ItemIcon';

export default function Arena() {
  const [active, setActive] = useState(null);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(15);
  const [streak, setStreak] = useState(0);
  const [damage, setDamage] = useState(null);
  const [combatBanner, setCombatBanner] = useState(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [eliminated, setEliminated] = useState([]);
  const [usedSpells, setUsedSpells] = useState([]);
  const [equipmentInventory, setEquipmentInventory] = useState([]);
  const [usedEquipmentThisQuestion, setUsedEquipmentThisQuestion] = useState([]);
  const timerRef = useRef(null);
  const quizKeyRef = useRef(null);
  const gold = useProgressStore((state) => state.gold || 0);
  const equippedIds = useProgressStore((state) => state.equippedIds || []);
  const equippedItems = INITIAL_ITEMS.filter((item) => equipmentInventory.includes(String(item.id)));

  useEffect(() => {
    setEquipmentInventory((current) => {
      const equippedKeys = equippedIds.map((id) => String(id));
      if (!current.length && equippedKeys.length) return equippedKeys;
      return current.filter((id) => equippedKeys.includes(id));
    });
  }, [equippedIds]);

  useEffect(() => {
    // Question-scoped effects never leak into the next question.
    setUsedEquipmentThisQuestion([]);
    setShieldActive(false);
    setEliminated([]);
    setTimeFrozen(false);
  }, [qIdx]);

  function useEquipment(item) {
    const itemKey = String(item.id);
    if (!equipmentInventory.includes(itemKey) || usedEquipmentThisQuestion.includes(itemKey)) return;
    setUsedEquipmentThisQuestion((current) => [...current, itemKey]);
    // A consumed item disappears for the remainder of this quiz session.
    setEquipmentInventory((current) => current.filter((id) => id !== itemKey));
    if (item.id === 1) setShieldActive(true);
    if (item.id === 2) {
      const incorrect = QUIZ_Q[qIdx].opts.map((_, index) => index).filter((index) => index !== QUIZ_Q[qIdx].ans);
      setEliminated(incorrect.slice(0, 2));
    }
    if (item.id === 6) {
      setTimeFrozen(true);
      setTimeout(() => setTimeFrozen(false), 5000);
    }
  }

  function useSpell(spell) {
    const cost = 20;
    if (gold < cost) return;
    // The current progression store has no spendGold action. Keep this UI gated
    // until that server-authoritative action exists; never mutate Gold locally.
    if (usedSpells.includes(spell)) return;
    setUsedSpells((current) => [...current, spell]);
    if (spell === "purge") {
      const incorrect = QUIZ_Q[qIdx].opts.map((_, index) => index).filter((index) => index !== QUIZ_Q[qIdx].ans);
      setEliminated(incorrect.slice(0, 2));
    }
    if (spell === "warp") {
      setTimeFrozen(true);
      setTimeout(() => setTimeFrozen(false), 5000);
    }
    if (spell === "shield") setShieldActive(true);
  }

  useEffect(() => {
    if (active === "quiz" && picked === null && !done && !timeFrozen) {
      timerRef.current = setInterval(() => {
        setTime((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            advance(-1);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, qIdx, picked, done]);

  function advance(idx) {
    if (timerRef.current) clearInterval(timerRef.current);
    setPicked(idx);
    const correct = idx === QUIZ_Q[qIdx].ans;
    const finalScore = correct ? score + 1 : score;
    if (correct) {
      setScore((s) => s + 1);
      setStreak((current) => {
        const next = current + 1;
        if (next >= 3) setCombatBanner("RAMPAGE!");
        else if (next === 2) setCombatBanner("DOUBLE KILL!");
        setTimeout(() => setCombatBanner(null), 1100);
        return next;
      });
      setDamage(`-${Math.round(100 / QUIZ_Q.length)} HP!`);
      setTimeout(() => setDamage(null), 900);
    } else if (shieldActive) {
      setShieldActive(false);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (qIdx + 1 >= QUIZ_Q.length) {
        setDone(true);
        if (!submitted) {
          setSubmitted(true);
          const quizScore = Math.round((finalScore / QUIZ_Q.length) * 100);
          if (!quizKeyRef.current) {
            quizKeyRef.current =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `quiz_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          }
          useProgressStore.getState().completeQuiz(quizScore, quizKeyRef.current);
        }
      } else {
        setQIdx((q) => q + 1);
        setPicked(null);
        setTime(15);
      }
    }, 1100);
  }

  function reset() {
    setActive(null);
    setQIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setSubmitted(false);
    setTime(15);
    setStreak(0);
    setDamage(null);
    setCombatBanner(null);
    setShieldActive(false);
    setTimeFrozen(false);
    setEliminated([]);
    setUsedSpells([]);
    setEquipmentInventory(equippedIds.map((id) => String(id)));
    quizKeyRef.current = null;
  }

  function restart() {
    setQIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setSubmitted(false);
    setTime(15);
    setStreak(0);
    setDamage(null);
    setCombatBanner(null);
    setShieldActive(false);
    setTimeFrozen(false);
    setEliminated([]);
    setUsedSpells([]);
    setEquipmentInventory(equippedIds.map((id) => String(id)));
    quizKeyRef.current = null;
  }

  if (active === "quiz") {
    if (done) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                fontFamily: "'Nunito',sans-serif",
                color: "var(--t1)",
                marginBottom: 4,
              }}
            >
              {score === 3 ? "Chinh phục hoàn hảo!" : score >= 2 ? "Trận thắng!" : "Lần sau cố hơn!"}
            </div>
            <div style={{ fontSize: 14, color: "var(--t3)", marginBottom: 24 }}>
              Đúng {score}/{QUIZ_Q.length} câu ·{" "}
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>+{score * 50} XP</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={restart}
              style={{
                padding: "11px 28px",
                background: "var(--indigo)",
                border: "none",
                borderRadius: "var(--r)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "'Nunito',sans-serif",
                boxShadow: "0 4px 14px rgba(99,102,241,.3)",
              }}
            >
              Chơi lại
            </button>
            <button
              onClick={reset}
              style={{
                padding: "11px 24px",
                background: "transparent",
                border: "1px solid var(--bd2)",
                borderRadius: "var(--r)",
                color: "var(--t2)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Trận khác
            </button>
          </div>
        </div>
      );
    }

    const q = QUIZ_Q[qIdx];
    return (
      <div
        className="quiz-dungeon-frame"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 28,
        }}
      >
        <div className="quiz-dungeon-content" style={{ width: "100%", maxWidth: 520 }}>
          <div className="quiz-boss-hud"><div className="quiz-boss-portrait">☠</div><div className="quiz-boss-info"><span>THE WORD WARDEN</span><strong>BOSS GUARDIAN · {QUIZ_Q.length} PHASES</strong><div className="quiz-boss-hp">{QUIZ_Q.map((_, index) => <i key={index} className={index < qIdx ? "is-destroyed" : index === qIdx ? "is-active" : ""} />)}</div></div><span className="quiz-boss-hp-label">{Math.max(0, QUIZ_Q.length - qIdx)} HP</span></div>
          {damage && <span className="quiz-damage-float">{damage}</span>}
          {combatBanner && <div className="quiz-streak-banner">{combatBanner}</div>}
          <div className="quiz-equipment-hud"><span>ARMORY LINK · STREAK {streak}</span><div className="quiz-equipped-items">{equippedItems.length ? equippedItems.map((item) => <button type="button" className="quiz-equipped-item" key={item.id} disabled={usedEquipmentThisQuestion.includes(String(item.id))} onClick={() => useEquipment(item)} title={`Use ${item.name} — ${item.effect}`}><ItemIcon id={item.lolItem} size={18} /><b>{item.name}</b><small>{item.effect}</small></button>) : <strong>NO ARTIFACTS EQUIPPED</strong>}</div></div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <button
              onClick={reset}
              style={{
                background: "none",
                border: "none",
                color: "var(--t3)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ← Thoát
            </button>
            <div style={{ display: "flex", gap: 4 }}>
              {QUIZ_Q.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 28,
                    height: 5,
                    borderRadius: 3,
                    background: i < qIdx ? "var(--green)" : i === qIdx ? "var(--indigo)" : "var(--s3)",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "monospace",
                color: time <= 5 ? "var(--red)" : "var(--t2)",
              }}
            >
              {time}s
            </span>
          </div>

          <div style={{ height: 5, background: "var(--s3)", borderRadius: 999, overflow: "hidden", marginBottom: 24 }}>
            <div
              style={{
                height: "100%",
                width: `${(time / 15) * 100}%`,
                background: time <= 5 ? "var(--red)" : "var(--indigo)",
                borderRadius: 999,
                transition: "width 1s linear, background .3s",
              }}
            />
          </div>

          <Card style={{ marginBottom: 16, textAlign: "center" }} glow="rgba(99,102,241,.1)">
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--t3)",
                textTransform: "uppercase",
                letterSpacing: ".6px",
                marginBottom: 10,
              }}
            >
              Câu {qIdx + 1}/{QUIZ_Q.length}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "'Nunito',sans-serif",
                color: "var(--t1)",
                lineHeight: "1.5",
              }}
            >
              {q.q}
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {q.opts.map((opt, i) => {
              const isAns = i === q.ans;
              const isSel = picked === i;
              let bg = "var(--s1)";
              let border = "var(--bd2)";
              let color = "var(--t1)";
              if (picked !== null) {
                if (isAns) {
                  bg = "var(--green-d)";
                  border = "rgba(16,185,129,.4)";
                  color = "var(--green)";
                } else if (isSel) {
                  bg = "var(--red-d)";
                  border = "rgba(239,68,68,.4)";
                  color = "var(--red)";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => picked === null && !eliminated.includes(i) && advance(i)}
                  disabled={picked !== null || eliminated.includes(i)}
                  className={eliminated.includes(i) ? "quiz-option-eliminated" : ""}
                  style={{
                    padding: "16px 14px",
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: "var(--r)",
                    color,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: picked !== null ? "default" : "pointer",
                    fontFamily: "'Nunito',sans-serif",
                    textAlign: "center",
                    transition: "all .2s",
                    lineHeight: "1.4",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="quiz-spell-tray"><SpellButton label="PURGE" icon="◈" cost={20} disabled={gold < 20 || picked !== null || usedSpells.includes("purge")} onClick={() => useSpell("purge")} active={eliminated.length > 0} /><SpellButton label={timeFrozen ? "FROZEN" : "TIME WARP"} icon="◌" cost={20} disabled={gold < 20 || picked !== null || timeFrozen || usedSpells.includes("warp")} onClick={() => useSpell("warp")} active={timeFrozen} /><SpellButton label={shieldActive ? "SHIELD ON" : "SHIELD"} icon="◇" cost={20} disabled={gold < 20 || picked !== null || shieldActive || usedSpells.includes("shield")} onClick={() => useSpell("shield")} active={shieldActive} /></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%" }}>
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: 20,
          fontWeight: 900,
          fontFamily: "'Nunito',sans-serif",
          color: "var(--t1)",
          letterSpacing: "-.3px",
        }}
      >
        Arena
      </h2>
      <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--t3)" }}>
        Chọn trận đấu để tích XP và leo bảng xếp hạng
      </p>

      <div className="arena-bento-grid">
        {ARENA_GAMES.map((game) => (
          <div
            key={game.id}
            className={`arena-mode-card ${game.id === "quiz" ? "arena-featured arena-puzzle" : game.id === "battle" ? "arena-combat" : "arena-puzzle is-locked"}`}
            onClick={game.id === "quiz" ? () => setActive(game.id) : undefined}
            role={game.id === "quiz" ? "button" : undefined}
            tabIndex={game.id === "quiz" ? 0 : undefined}
            aria-disabled={game.id !== "quiz"}
            onKeyDown={game.id === "quiz" ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(game.id); } } : undefined}
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bd)",
              borderRadius: 0,
              overflow: "hidden",
              cursor: game.id === "quiz" ? "pointer" : "default",
              position: "relative",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              if (game.id !== "quiz") return;
              e.currentTarget.style.borderColor = game.id === "battle" ? "rgba(239,68,68,.7)" : "rgba(34,211,238,.7)";
              e.currentTarget.style.boxShadow = game.id === "battle" ? "0 0 20px rgba(239,68,68,.4)" : "0 0 20px rgba(34,211,238,.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bd)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Champion splash as card background */}
            <div className="arena-mode-art" style={{ height: 100, position: "relative", overflow: "hidden" }}>
              <img
                src={splash(game.champion)}
                alt={game.name}
                className="arena-mode-image"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 20%",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to bottom, rgba(13,17,23,.3), rgba(13,17,23,.85))",
                }}
              />
              {game.id === "quiz" && (
                <div style={{ position: "absolute", top: 10, right: 10 }}>
                  <Chip color="#ef4444" bg="var(--red-d)">
                    HOT
                  </Chip>
                </div>
              )}
              {game.id !== "quiz" && <div className="arena-lock-overlay"><span>🔒</span><strong>SẮP MỞ</strong><small>COMING SOON</small></div>}
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--t1)",
                  fontFamily: "'Nunito',sans-serif",
                  marginBottom: 4,
                }}
              >
                {game.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 14, lineHeight: "1.5" }}>
                {game.desc}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--t3)" }}>{game.players} người chơi</span>
                <Chip color="var(--gold)" bg="var(--gold-d)">
                  +{game.xp} XP
                </Chip>
              </div>
            </div>
            {game.id === "quiz" && <span className="arena-play-cta">VÀO TRẬN ↗</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function SpellButton({ label, icon, cost, disabled, onClick, active }) {
  return <button type="button" className={`quiz-spell ${active ? 'is-active' : ''}`} disabled={disabled} onClick={onClick}><span>{icon}</span><strong>{label}</strong><small>{cost} GOLD</small></button>;
}

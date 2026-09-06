import React, { useState, useRef, useEffect } from 'react';
import { ARENA_GAMES, QUIZ_Q, splash } from '../constants/gameData';
import { useProgressStore } from '../context/progressStore';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function Arena() {
  const [active, setActive] = useState(null);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(15);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active === "quiz" && picked === null && !done) {
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
    if (correct) setScore((s) => s + 1);

    setTimeout(() => {
      if (qIdx + 1 >= QUIZ_Q.length) {
        setDone(true);
        if (!submitted) {
          setSubmitted(true);
          const earnedXp = Math.min(finalScore * 50, 150);
          useProgressStore.getState().submitScore(earnedXp, {
            score: Math.round((finalScore / QUIZ_Q.length) * 100),
            isQuiz: true,
          });
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
  }

  function restart() {
    setQIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setSubmitted(false);
    setTime(15);
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
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 28,
        }}
      >
        <div style={{ width: "100%", maxWidth: 520 }}>
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
                  onClick={() => picked === null && advance(i)}
                  disabled={picked !== null}
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {ARENA_GAMES.map((game) => (
          <div
            key={game.id}
            onClick={() => setActive(game.id)}
            style={{
              background: "var(--s1)",
              border: "1px solid var(--bd)",
              borderRadius: "var(--r-xl)",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,.4)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(99,102,241,.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bd)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Champion splash as card background */}
            <div style={{ height: 100, position: "relative", overflow: "hidden" }}>
              <img
                src={splash(game.champion)}
                alt={game.name}
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
              {game.hot && (
                <div style={{ position: "absolute", top: 10, right: 10 }}>
                  <Chip color="#ef4444" bg="var(--red-d)">
                    HOT
                  </Chip>
                </div>
              )}
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
          </div>
        ))}
      </div>
    </div>
  );
}

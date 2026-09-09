import React, { useState } from 'react';
import { splash, LOL_ICONS } from '../constants/gameData';
import { useProgressStore } from '../context/progressStore';
import { useAuthStore } from '../context/authStore';
import ChampPortrait from '../components/common/ChampPortrait';
import ChampIcon from '../components/common/ChampIcon';
import Chip from '../components/common/Chip';
import Bar from '../components/common/Bar';
import SHead from '../components/common/SHead';
import LoLIcon from '../components/common/LoLIcon';
import LessonModal from '../components/learning/LessonModal';

export default function Learning() {
  const {
    quests,
    questUnits,
    completeUnitLesson,
    startLessonAttempt,
    submitLessonAttempt,
    activeQuestIndex,
    setActiveQuestIndex,
  } = useProgressStore();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [open, setOpen] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // ─── Lesson Modal State ─────────────────────────────────────────────────────
  const [activeLesson, setActiveLesson] = useState(null); // unit object or null
  const sel = activeQuestIndex ?? 0;
  const q = quests[sel] || quests[0];
  const units = questUnits[q.id] || [];

  // ─── Open Lesson Modal (replaces old direct-completion handler) ──────────────
  const handleStartLesson = (unit) => {
    if (submitting || activeLesson) return; // Prevent double-open
    // Both active and done units can open the lesson modal
    // (done = review mode, active = first attempt)
    if (unit.status === "active" || unit.status === "done") {
      setActiveLesson(unit);
    }
  };

  // ─── Lesson Completion Callback (only called on score >= 60) ─────────────────
  const handleLessonComplete = async ({ questId, unitId, score }) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await completeUnitLesson(questId, unitId);
    } finally {
      setSubmitting(false);
      setActiveLesson(null);
      setOpen(null);
    }
  };

  // ─── Close Lesson Modal (no reward) ──────────────────────────────────────────
  const handleLessonClose = () => {
    if (!submitting) {
      setActiveLesson(null);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ─── Lesson Modal (rendered globally within Learning page) ──────── */}
      <LessonModal
        isOpen={!!activeLesson}
        questId={q.id}
        unit={activeLesson}
        onClose={handleLessonClose}
        onComplete={handleLessonComplete}
        onStartAttempt={startLessonAttempt}
        onSubmitAttempt={submitLessonAttempt}
        isAuthenticated={isAuthenticated}
      />

      {/* Level sidebar */}
      <div
        style={{
          width: 220,
          minWidth: 220,
          background: "var(--s1)",
          borderRight: "1px solid var(--bd)",
          overflow: "auto",
          padding: "16px 10px",
        }}
      >
        <SHead>Bản đồ dungeon</SHead>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {quests.map((quest, i) => {
            const isSelected = sel === i;
            const isLocked = quest.status === "locked";
            const isComplete = quest.status === "complete";

            return (
              <button
                key={quest.id}
                onClick={() => !isLocked && setActiveQuestIndex(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px",
                  borderRadius: "var(--r-sm)",
                  border: isSelected ? "1px solid var(--indigo)" : "1px solid transparent",
                  background: isSelected ? "rgba(99,102,241,.12)" : "transparent",
                  cursor: isLocked ? "not-allowed" : "pointer",
                  opacity: isLocked ? 0.4 : 1,
                  transition: "all .12s",
                  textAlign: "left",
                }}
              >
                {isLocked ? (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--s2)",
                      border: "1.5px solid var(--bd)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "var(--t3)",
                      flexShrink: 0,
                    }}
                  >
                    KHÓA
                  </div>
                ) : (
                  <ChampIcon name={quest.champion} size={36} active={isSelected} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: "'Nunito',sans-serif",
                      color: isSelected ? "var(--t1)" : "var(--t2)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{quest.label} · {quest.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: "var(--t3)", fontFamily: "monospace" }}>
                      {quest.done}/{quest.units} Units
                    </span>
                    {isComplete && (
                      <span style={{ fontSize: 9, color: "var(--green)", fontWeight: 700 }}>✓ XONG</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unit list */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {/* Splash header */}
        <div
          style={{
            position: "relative",
            height: 140,
            borderRadius: "var(--r-xl)",
            overflow: "hidden",
            marginBottom: 22,
          }}
        >
          <img
            src={splash(q.champion)}
            alt={q.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 25%",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, rgba(13,17,23,.92) 25%, rgba(13,17,23,.45) 60%, rgba(13,17,23,.85) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "0 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {q.status !== "locked" && <ChampPortrait name={q.champion} size={64} />}
            <div>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: 20,
                  fontWeight: 900,
                  fontFamily: "'Nunito',sans-serif",
                  color: "var(--t1)",
                  letterSpacing: "-.3px",
                  textShadow: "0 2px 6px rgba(0,0,0,.8)",
                }}
              >
                {q.label} — {q.name}
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "monospace" }}>
                  Đã hoàn thành {q.done}/{q.units} bài học
                </span>
                {q.status === "active" && (
                  <Chip color="var(--indigo)" bg="var(--indigo-d)">
                    Đang chinh phục
                  </Chip>
                )}
                {q.status === "complete" && (
                  <Chip color="var(--green)" bg="var(--green-d)">
                    Hoàn thành 100%
                  </Chip>
                )}
              </div>
              <div style={{ marginTop: 8, width: 240 }}>
                <Bar pct={(q.done / q.units) * 100} color={q.color || "var(--indigo)"} height={5} glow />
              </div>
            </div>
          </div>
        </div>

        {/* Units Roadmap */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {units.map((unit) => {
            const isDone = unit.status === "done";
            const isActive = unit.status === "active";
            const isLocked = unit.status === "locked";

            return (
              <div
                key={unit.id}
                style={{
                  background: "var(--s1)",
                  border: `1px solid ${
                    isActive
                      ? "rgba(99,102,241,.5)"
                      : isDone
                      ? "rgba(16,185,129,.25)"
                      : "var(--bd)"
                  }`,
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                  opacity: isLocked ? 0.45 : 1,
                  boxShadow: isActive ? "0 0 16px rgba(99,102,241,.15)" : "none",
                  transition: "all .15s ease",
                }}
              >
                <div
                  onClick={() => !isLocked && setOpen(open === unit.id ? null : unit.id)}
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    cursor: isLocked ? "not-allowed" : "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      background: isDone
                        ? "var(--green-d)"
                        : isActive
                        ? "var(--indigo-d)"
                        : "var(--s2)",
                      border: `1.5px solid ${
                        isDone
                          ? "rgba(16,185,129,.4)"
                          : isActive
                          ? "rgba(99,102,241,.5)"
                          : "var(--bd)"
                      }`,
                    }}
                  >
                    {isLocked ? (
                      <span style={{ fontSize: 11, color: "var(--t3)" }}>✕</span>
                    ) : isDone ? (
                      <span style={{ color: "var(--green)" }}>✓</span>
                    ) : isActive ? (
                      <LoLIcon src={LOL_ICONS.battle} size={22} />
                    ) : (
                      <span style={{ color: "var(--t3)" }}>○</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isDone ? "var(--t2)" : isActive ? "var(--t1)" : "var(--t3)",
                        fontFamily: "'Nunito',sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span>Unit {unit.id}: {unit.title}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                      {unit.words} từ vựng · +60 XP
                    </div>
                  </div>
                  {isDone && <Chip color="var(--green)" bg="var(--green-d)">Hoàn thành</Chip>}
                  {isActive && <Chip color="var(--indigo)" bg="var(--indigo-d)">Đang mở</Chip>}
                  {isLocked && <Chip color="var(--t3)" bg="var(--s2)">Khoá</Chip>}
                </div>

                {open === unit.id && !isLocked && (
                  <div
                    style={{
                      padding: "12px 18px 16px",
                      borderTop: "1px solid var(--bd)",
                      background: "var(--s2)",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => handleStartLesson(unit)}
                      disabled={submitting || !!activeLesson}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: isDone ? "var(--s3)" : "var(--indigo)",
                        border: isDone ? "1px solid var(--bd2)" : "none",
                        borderRadius: "var(--r-sm)",
                        color: isDone ? "var(--t1)" : "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: (submitting || !!activeLesson) ? "not-allowed" : "pointer",
                        fontFamily: "'Nunito',sans-serif",
                        boxShadow: isDone ? "none" : "0 4px 12px rgba(99,102,241,.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        opacity: (submitting || !!activeLesson) ? 0.6 : 1,
                      }}
                    >
                      <LoLIcon src={LOL_ICONS.battle} size={16} />
                      {isDone ? "Ôn lại bài học" : "Bắt đầu chiến"}
                    </button>
                    <button
                      onClick={() => alert(`Từ vựng Unit ${unit.id}: ${unit.words} từ vựng đã sẵn sàng trong Codex.`)}
                      style={{
                        padding: "10px 16px",
                        background: "transparent",
                        border: "1px solid var(--bd2)",
                        borderRadius: "var(--r-sm)",
                        color: "var(--t2)",
                        fontSize: 13,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Từ vựng ({unit.words})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

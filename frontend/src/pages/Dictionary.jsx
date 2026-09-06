import React, { useState } from 'react';
import { CODEX_ENTRY } from '../constants/gameData';
import { useProgressStore } from '../context/progressStore';
import Chip from '../components/common/Chip';

import toast from 'react-hot-toast';

export default function Dictionary() {
  const [query, setQuery] = useState("Serendipity");
  const [tab, setTab] = useState("meaning");
  const [xpPopped, setXpPopped] = useState(false);
  const recent = ["Ephemeral", "Nostalgia", "Melancholy", "Ubiquitous", "Eloquent"];

  const savedWords = useProgressStore((s) => s.savedWords || []);
  const saveWord = useProgressStore((s) => s.saveWord);

  const currentWordKey = (query || CODEX_ENTRY.word).toLowerCase().trim();
  const isSaved = savedWords.includes(currentWordKey);

  async function handleSave() {
    if (isSaved) {
      toast('Từ vựng này bạn đã lưu trước đó!');
      return;
    }
    const result = await saveWord(currentWordKey, CODEX_ENTRY.xp || 15);
    if (result.success) {
      setXpPopped(true);
      setTimeout(() => setXpPopped(false), 1800);
    }
  }

  function handlePlayAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(query || CODEX_ENTRY.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%", maxWidth: 780 }}>
      <h2
        style={{
          margin: "0 0 18px",
          fontSize: 20,
          fontWeight: 900,
          fontFamily: "'Nunito',sans-serif",
          color: "var(--t1)",
          letterSpacing: "-.3px",
        }}
      >
        Codex — Từ điển
      </h2>

      {/* Search Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--s1)",
            border: "1px solid var(--bd2)",
            borderRadius: "var(--r)",
            padding: "0 16px",
            height: 48,
          }}
        >
          <svg width={15} height={15} viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="var(--t3)" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ tiếng Anh cần tra..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--t1)",
              background: "none",
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 600,
            }}
          />
        </div>
        <button
          style={{
            padding: "0 24px",
            background: "var(--indigo)",
            border: "none",
            borderRadius: "var(--r)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "'Nunito',sans-serif",
            boxShadow: "0 4px 12px rgba(99,102,241,.3)",
          }}
        >
          Tra
        </button>
      </div>

      {/* Recent Keywords */}
      <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--t3)" }}>Gần đây:</span>
        {recent.map((w) => (
          <button
            key={w}
            onClick={() => setQuery(w)}
            style={{
              padding: "3px 10px",
              background: "var(--s2)",
              border: "1px solid var(--bd)",
              borderRadius: 999,
              color: "var(--t2)",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Word Details Card */}
      <div
        style={{
          background: "var(--s1)",
          border: "1px solid var(--bd2)",
          borderRadius: "var(--r-xl)",
          overflow: "hidden",
          boxShadow: "var(--sh)",
        }}
      >
        <div
          style={{
            padding: "24px 28px",
            background: "linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.04))",
            borderBottom: "1px solid var(--bd)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  fontFamily: "'Nunito',sans-serif",
                  color: "var(--t1)",
                  letterSpacing: "-.5px",
                  marginBottom: 6,
                }}
              >
                {CODEX_ENTRY.word}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--t2)", fontFamily: "monospace" }}>
                  {CODEX_ENTRY.phonetic}
                </span>
                <button
                  onClick={handlePlayAudio}
                  title="Phát âm"
                  style={{
                    fontSize: 12,
                    background: "var(--s2)",
                    border: "1px solid var(--bd)",
                    borderRadius: 6,
                    color: "var(--indigo)",
                    cursor: "pointer",
                    padding: "3px 8px",
                    fontWeight: 700,
                  }}
                >
                  Phát âm
                </button>
                <Chip color="var(--t2)" bg="var(--s2)">
                  {CODEX_ENTRY.type}
                </Chip>
                <Chip color="var(--purple)" bg="var(--purple-d)">
                  {CODEX_ENTRY.level}
                </Chip>
                <Chip color="var(--t3)" bg="var(--s2)">
                  Freq: {CODEX_ENTRY.freq}
                </Chip>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <button
                onClick={handleSave}
                style={{
                  padding: "6px 14px",
                  background: isSaved ? "var(--green-d)" : "var(--s2)",
                  border: `1px solid ${isSaved ? "rgba(16,185,129,.4)" : "var(--bd2)"}`,
                  borderRadius: "var(--r-sm)",
                  color: isSaved ? "var(--green)" : "var(--t1)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isSaved ? "default" : "pointer",
                  fontFamily: "'Nunito',sans-serif",
                }}
              >
                {isSaved ? "✓ Đã lưu" : "Lưu từ"}
              </button>
              {xpPopped && (
                <div
                  style={{
                    position: "absolute",
                    top: -28,
                    right: 0,
                    background: "var(--gold-d)",
                    border: "1px solid var(--gold)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--gold)",
                    whiteSpace: "nowrap",
                    animation: "slide-up .3s ease",
                  }}
                >
                  +{CODEX_ENTRY.xp} XP
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--bd)" }}>
          {["meaning", "examples", "advanced"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "transparent",
                color: tab === t ? "var(--indigo)" : "var(--t3)",
                fontWeight: tab === t ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                borderBottom: `2px solid ${tab === t ? "var(--indigo)" : "transparent"}`,
                fontFamily: "'Nunito',sans-serif",
                transition: "all .12s",
              }}
            >
              {t === "meaning" ? "Nghĩa" : t === "examples" ? "Ví dụ" : "Nâng cao"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "24px 28px" }}>
          {tab === "meaning" && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 15, color: "var(--t1)", lineHeight: "1.7", fontWeight: 500 }}>
                {CODEX_ENTRY.meaning}
              </p>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--purple)", fontStyle: "italic", lineHeight: "1.6" }}>
                {CODEX_ENTRY.meaning_vn}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
                    Đồng nghĩa
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {CODEX_ENTRY.synonyms.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        style={{
                          padding: "3px 10px",
                          background: "var(--s2)",
                          border: "1px solid var(--bd)",
                          borderRadius: 999,
                          color: "var(--indigo)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
                    Trái nghĩa
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {CODEX_ENTRY.antonyms.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        style={{
                          padding: "3px 10px",
                          background: "var(--s2)",
                          border: "1px solid var(--bd)",
                          borderRadius: 999,
                          color: "var(--t2)",
                          fontSize: 12,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "examples" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CODEX_ENTRY.examples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    background: "var(--s2)",
                    border: "1px solid var(--bd)",
                    borderRadius: "var(--r)",
                    borderLeft: "3px solid var(--indigo)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 14, color: "var(--t1)", fontStyle: "italic", lineHeight: "1.6" }}>
                    "{ex}"
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === "advanced" && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>
                  Cụm từ thông dụng
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {CODEX_ENTRY.collocations.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "9px 12px",
                        background: "var(--s2)",
                        border: "1px solid var(--bd)",
                        borderRadius: "var(--r-sm)",
                        fontSize: 13,
                        color: "var(--t1)",
                        fontStyle: "italic",
                      }}
                    >
                      "{c}"
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--gold-d)",
                  border: "1px solid var(--gold-g)",
                  borderRadius: "var(--r)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>
                  Ghi nhớ nhanh
                </div>
                <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: "1.6" }}>
                  <em>Serendipity</em> xuất phát từ câu chuyện cổ Ba Tư "The Three Princes of Serendip" — nơi các hoàng tử thường phát hiện điều tuyệt vời một cách tình cờ.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div style={{ padding: "0 28px 24px", display: "flex", gap: 8 }}>
          <button
            style={{
              flex: 1,
              padding: "10px",
              background: "var(--indigo)",
              border: "none",
              borderRadius: "var(--r-sm)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Nunito',sans-serif",
              boxShadow: "0 4px 12px rgba(99,102,241,.25)",
            }}
          >
            + Flashcard · +{CODEX_ENTRY.xp} XP
          </button>
          <button
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "1px solid var(--bd2)",
              borderRadius: "var(--r-sm)",
              color: "var(--t2)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 600,
            }}
          >
            Hỏi Joy
          </button>
        </div>
      </div>
    </div>
  );
}

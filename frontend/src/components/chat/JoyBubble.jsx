import React, { useState, useRef, useEffect } from 'react';
import { BOT_REPLIES, LOL_ICONS } from '../../constants/gameData';
import LoLIcon from '../common/LoLIcon';
import { useProgressStore } from '../../context/progressStore';

export default function JoyBubble() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: "bot",
      text: "Chào bạn! Mình là **Joy**, trợ lý AI học tiếng Anh của bạn.\n\nHỏi mình bất cứ điều gì nhé!",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const lastChatTimeRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  function send() {
    const t = input.trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setTyping(true);

    const now = Date.now();
    if (t.length >= 3 && now - lastChatTimeRef.current >= 4000) {
      lastChatTimeRef.current = now;
      useProgressStore.getState().submitScore(0, { isChat: true, silent: true });
    }
    setTimeout(() => {
      const l = t.toLowerCase();
      const r =
        l.includes("grammar") || l.includes("ngữ pháp")
          ? BOT_REPLIES.grammar
          : l.includes("hello") || l.includes("chào")
          ? BOT_REPLIES.hello
          : l.includes("vocab") || l.includes("từ vựng")
          ? BOT_REPLIES.vocab
          : BOT_REPLIES.default;
      setTyping(false);
      setMsgs((m) => [...m, { role: "bot", text: r }]);
    }, 1300);
  }

  function renderText(text) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} style={{ minHeight: line === "" ? "6px" : undefined }}>
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**") ? (
              <strong key={j}>{p.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{p}</span>
            )
          )}
        </div>
      );
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 12,
      }}
    >
      {open && (
        <div
          style={{
            width: 340,
            height: 490,
            background: "var(--s1)",
            border: "1px solid var(--bd2)",
            borderRadius: "var(--r-xl)",
            boxShadow: "var(--sh-lg)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "slide-up .2s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: "var(--indigo)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(255,255,255,.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <LoLIcon src={LOL_ICONS.robot} size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "'Nunito',sans-serif" }}>
                Joy AI
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#4ade80",
                    animation: "glow-pulse 2s infinite",
                  }}
                />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>
                  Online · Sẵn sàng hỗ trợ
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,.15)",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick chips */}
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--bd)",
              display: "flex",
              gap: 5,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            {["Ngữ pháp", "Từ vựng", "Chào"].map((chip) => (
              <button
                key={chip}
                onClick={() => setInput(chip)}
                style={{
                  padding: "4px 10px",
                  background: "var(--s2)",
                  border: "1px solid var(--bd)",
                  borderRadius: 999,
                  color: "var(--t2)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {msgs.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "bot" && (
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "var(--indigo-d)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <LoLIcon src={LOL_ICONS.robot} size={22} />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "9px 12px",
                    background: msg.role === "user" ? "var(--indigo)" : "var(--s2)",
                    border: msg.role === "bot" ? "1px solid var(--bd)" : "none",
                    borderRadius:
                      msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                    color: msg.role === "user" ? "#fff" : "var(--t1)",
                    fontSize: 12.5,
                    lineHeight: "1.6",
                    fontFamily: "'Nunito',sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--indigo-d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <LoLIcon src={LOL_ICONS.robot} size={22} />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--s2)",
                    border: "1px solid var(--bd)",
                    borderRadius: "4px 14px 14px 14px",
                    display: "flex",
                    gap: 3,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "var(--t3)",
                        animation: "dot-pop 1.2s infinite",
                        animationDelay: `${i * 0.18}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Box */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--bd)",
              flexShrink: 0,
              display: "flex",
              gap: 8,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Hỏi Joy bất cứ điều gì..."
              style={{
                flex: 1,
                padding: "9px 12px",
                background: "var(--s2)",
                border: "1px solid var(--bd)",
                borderRadius: "var(--r)",
                outline: "none",
                fontSize: 13,
                color: "var(--t1)",
                fontFamily: "'Nunito',sans-serif",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: input.trim() ? "var(--indigo)" : "var(--s3)",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
                transition: "background .15s",
                boxShadow: input.trim() ? "0 4px 12px rgba(99,102,241,.3)" : "none",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: open ? "var(--s3)" : "var(--indigo)",
          border: `1.5px solid ${open ? "var(--bd2)" : "transparent"}`,
          cursor: "pointer",
          boxShadow: open ? "none" : "0 4px 20px rgba(99,102,241,.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all .2s",
          overflow: "hidden",
        }}
      >
        {open ? <span style={{ fontSize: 18, color: "var(--t1)" }}>✕</span> : <LoLIcon src={LOL_ICONS.robot} size={36} />}
      </button>
    </div>
  );
}

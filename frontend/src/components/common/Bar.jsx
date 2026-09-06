import React from 'react';

export default function Bar({ pct, color, height = 6, glow = false }) {
  return (
    <div style={{ height, background: "rgba(255,255,255,.06)", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color,
          borderRadius: 999,
          boxShadow: glow ? `0 0 8px ${color}88` : undefined,
          transition: "width .5s ease",
        }}
      />
    </div>
  );
}

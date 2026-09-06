import React from 'react';

export default function Chip({ children, color, bg }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontFamily: "monospace",
      }}
    >
      {children}
    </span>
  );
}

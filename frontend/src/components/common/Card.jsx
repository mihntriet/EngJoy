import React from 'react';

export default function Card({ children, style, glow }) {
  return (
    <div
      style={{
        background: "var(--s1)",
        border: "1px solid var(--bd)",
        borderRadius: "var(--r-lg)",
        padding: 20,
        boxShadow: glow ? `var(--sh-sm), 0 0 24px ${glow}` : "var(--sh-sm)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

import React from 'react';

export default function SHead({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--t3)",
        textTransform: "uppercase",
        letterSpacing: ".7px",
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

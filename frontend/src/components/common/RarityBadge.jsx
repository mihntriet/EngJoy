import React from 'react';
import { RARITY } from '../../constants/gameData';

export default function RarityBadge({ r }) {
  const item = RARITY[r] || RARITY.common;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 999,
        background: item.bg,
        color: item.color,
        border: `1px solid ${item.border}`,
        fontFamily: "monospace",
        letterSpacing: ".3px",
      }}
    >
      {item.label}
    </span>
  );
}

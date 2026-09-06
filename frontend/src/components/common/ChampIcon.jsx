import React from 'react';
import { champ } from '../../constants/gameData';

export default function ChampIcon({ name, size = 36, active = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: "hidden",
        flexShrink: 0,
        border: `1.5px solid ${active ? "var(--indigo)" : "var(--bd)"}`,
        background: "var(--s2)",
      }}
    >
      <img
        src={champ(name)}
        alt={name}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

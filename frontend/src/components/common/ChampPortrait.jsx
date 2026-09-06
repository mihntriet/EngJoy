import React from 'react';
import { loading } from '../../constants/gameData';

export default function ChampPortrait({ name, size = 44 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: "2px solid rgba(99,102,241,.5)",
        background: "var(--s2)",
      }}
    >
      <img
        src={loading(name)}
        alt={name}
        style={{
          width: "100%",
          height: "280%",
          objectFit: "cover",
          objectPosition: "top center",
          display: "block",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

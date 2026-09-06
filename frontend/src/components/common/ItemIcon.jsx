import React from 'react';
import { item } from '../../constants/gameData';

export default function ItemIcon({ id, size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: "hidden",
        flexShrink: 0,
        background: "var(--s2)",
      }}
    >
      <img
        src={item(id)}
        alt={`item-${id}`}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

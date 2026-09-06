import React from 'react';

export default function LoLIcon({ src, size = 16, alt = '', style = {}, className = '' }) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        display: "inline-block",
        verticalAlign: "middle",
        objectFit: "cover",
        flexShrink: 0,
        ...style,
      }}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

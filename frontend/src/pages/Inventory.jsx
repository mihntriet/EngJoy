import React, { useState } from 'react';
import { RARITY, LOL_ICONS } from '../constants/gameData';
import ItemIcon from '../components/common/ItemIcon';
import RarityBadge from '../components/common/RarityBadge';
import LoLIcon from '../components/common/LoLIcon';

export default function Inventory({ items, gold, onToggleEquip, onBuyItem }) {
  const [tab, setTab] = useState("owned");
  const [hoverId, setHoverId] = useState(null);

  const shown = tab === "owned" ? items.filter((i) => i.owned) : items.filter((i) => !i.owned);

  return (
    <div style={{ padding: 28, overflow: "auto", height: "100%" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2
            style={{
              margin: "0 0 4px",
              fontSize: 20,
              fontWeight: 900,
              fontFamily: "'Nunito',sans-serif",
              color: "var(--t1)",
              letterSpacing: "-.3px",
            }}
          >
            Kho đồ
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--t3)" }}>
            Trang bị và tiêu thụ phẩm hỗ trợ học tập
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            background: "var(--gold-d)",
            border: "1px solid var(--gold-g)",
            borderRadius: "var(--r)",
          }}
        >
          <LoLIcon src={LOL_ICONS.gold} size={18} />
          <span style={{ fontSize: 15, fontWeight: 900, color: "var(--gold)", fontFamily: "'Nunito',sans-serif" }}>
            {gold.toLocaleString()}
          </span>
          <span style={{ fontSize: 11, color: "var(--t3)" }}>vàng</span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "var(--s2)",
          borderRadius: "var(--r-sm)",
          padding: 3,
          marginBottom: 20,
          width: "fit-content",
        }}
      >
        {["owned", "shop"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 24px",
              borderRadius: "var(--r-sm)",
              border: "none",
              background: tab === t ? "var(--s1)" : "transparent",
              color: tab === t ? "var(--t1)" : "var(--t3)",
              fontWeight: tab === t ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Nunito',sans-serif",
              boxShadow: tab === t ? "var(--sh-sm)" : "none",
              transition: "all .12s",
            }}
          >
            {t === "owned" ? "Của tôi" : "Cửa hàng"}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
        {shown.map((it) => {
          const r = RARITY[it.rarity];
          const canBuy = gold >= it.price;
          const isHovered = hoverId === it.id;

          return (
            <div
              key={it.id}
              onMouseEnter={() => setHoverId(it.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                background: "var(--s1)",
                borderRadius: "var(--r-xl)",
                overflow: "hidden",
                border: `1px solid ${
                  it.equipped
                    ? r.border
                    : isHovered
                    ? "rgba(99,102,241,.3)"
                    : "var(--bd)"
                }`,
                boxShadow: it.equipped
                  ? `0 0 18px ${r.border}`
                  : isHovered
                  ? "0 0 16px rgba(99,102,241,.1)"
                  : "var(--sh-sm)",
                transition: "all .15s",
              }}
            >
              {/* Top Section */}
              <div
                style={{
                  padding: "20px 20px 16px",
                  background: it.equipped ? r.bg : "transparent",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <ItemIcon id={it.lolItem} size={56} />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 8,
                      boxShadow: `inset 0 0 0 1.5px ${r.border}`,
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "var(--t1)",
                        fontFamily: "'Nunito',sans-serif",
                      }}
                    >
                      {it.name}
                    </div>
                    <RarityBadge r={it.rarity} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>
                    LoL: {it.lolName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: "1.5" }}>
                    {it.desc}
                  </div>
                </div>
              </div>

              {/* Effect Row */}
              <div
                style={{
                  padding: "9px 20px",
                  borderTop: "1px solid var(--bd)",
                  borderBottom: "1px solid var(--bd)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: r.color, fontWeight: 700 }}>
                  {it.effect}
                </span>
                {it.cooldown && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "var(--green)",
                      fontWeight: 700,
                    }}
                  >
                    Hồi: {it.cooldown}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <div style={{ padding: "12px 20px" }}>
                {tab === "owned" ? (
                  <button
                    onClick={() => onToggleEquip(it.id)}
                    style={{
                      width: "100%",
                      padding: "9px",
                      borderRadius: "var(--r-sm)",
                      border: `1px solid ${it.equipped ? r.border : "var(--bd2)"}`,
                      background: it.equipped ? r.bg : "transparent",
                      color: it.equipped ? r.color : "var(--t2)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Nunito',sans-serif",
                      transition: "all .15s",
                    }}
                  >
                    {it.equipped ? "✓ Đang trang bị — Gỡ ra" : "Trang bị"}
                  </button>
                ) : (
                  <button
                    onClick={() => canBuy && onBuyItem(it.id, it.price)}
                    style={{
                      width: "100%",
                      padding: "9px",
                      borderRadius: "var(--r-sm)",
                      border: "none",
                      background: canBuy ? "var(--gold)" : "var(--s2)",
                      color: canBuy ? "#000" : "var(--t3)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: canBuy ? "pointer" : "not-allowed",
                      fontFamily: "'Nunito',sans-serif",
                      boxShadow: canBuy ? "0 4px 12px var(--gold-g)" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {canBuy ? (
                      <>
                        <LoLIcon src={LOL_ICONS.gold} size={15} />
                        <span>{it.price.toLocaleString()} vàng</span>
                      </>
                    ) : (
                      `Không đủ vàng (${it.price.toLocaleString()})`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

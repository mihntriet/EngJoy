import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { splash, RARITY, LOL_ICONS } from '../constants/gameData';
import ChampPortrait from '../components/common/ChampPortrait';
import ItemIcon from '../components/common/ItemIcon';
import Chip from '../components/common/Chip';
import Card from '../components/common/Card';
import Bar from '../components/common/Bar';
import LoLIcon from '../components/common/LoLIcon';
import { useProgressStore } from '../context/progressStore';
import { useAuthStore } from '../context/authStore';

export default function Dashboard({ user, items, missions, onNav }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { quests, questUnits } = useProgressStore();

  // 1. Dynamic active quest & unit
  const activeQuest = quests?.find((q) => q.status === "active") || quests?.[0] || { label: "A1", id: 1, champion: "Ashe" };
  const currentUnits = questUnits?.[activeQuest.id] || [];
  const activeUnit = currentUnits.find((u) => u.status === "active") || currentUnits[0] || { id: 1, title: "Bảng chữ cái & Phát âm", words: 25 };

  // 2. Equipped items
  const equipped = items.filter((i) => (user.equippedIds || []).includes(i.id));

  // 3. XP Progression
  const xpInLevel = user.xp || 0;
  const xpNeeded = user.xpNext || 200;
  const xpPct = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
  const xpRemaining = Math.max(0, xpNeeded - xpInLevel);

  return (
    <div
      className="dashboard-scroll-container"
      style={{
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "24px 32px 36px",
      }}
    >
      {/* ─── 1. HERO / NEXT QUEST CARD (Compact 160-180px) ────────────────── */}
      <div
        className="quest-card-hero"
        style={{
          position: "relative",
          minHeight: 170,
          borderRadius: "var(--r-xl)",
          overflow: "hidden",
          border: "1px solid var(--bd-hover)",
          boxShadow: "var(--sh-glow)",
          display: "flex",
          alignItems: "center",
          background: "var(--bg-card)",
        }}
      >
        {/* Right Champion Splash with smooth gradient fade */}
        <div
          className="quest-card-hero-bg"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "55%",
            overflow: "hidden",
          }}
        >
          <img
            src={splash(activeQuest.champion || user.champion)}
            alt={activeQuest.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 25%",
              display: "block",
            }}
          />
          {/* Gradients to fade smoothly into the card surface */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, var(--bg-card) 5%, rgba(21,27,44,.7) 50%, rgba(21,27,44,.2) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, var(--bg-card) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* Left Content (Clear Hierarchy & Primary CTA) */}
        <div
          className="quest-card-content"
          style={{
            position: "relative",
            zIndex: 10,
            padding: "24px 32px",
            maxWidth: "68%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 800,
                color: "var(--purple-light)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                background: "var(--purple-d)",
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              ⚔️ Nhiệm vụ kế tiếp
            </span>
            <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 700 }}>
              {activeQuest.label} · Unit {activeUnit.id}
            </span>
          </div>

          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "var(--t1)",
                margin: 0,
                letterSpacing: "-0.4px",
                lineHeight: 1.2,
              }}
            >
              {activeUnit.title}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--t2)", fontWeight: 500 }}>
              Tiếp tục hành trình chinh phục tiếng Anh cùng hộ vệ {activeQuest.champion}.
            </p>
          </div>

          {/* Reward preview & Primary CTA Button */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
            <button
              onClick={() => onNav("learn")}
              className="rpg-btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: "var(--r)",
                fontSize: 13.5,
                fontWeight: 800,
                cursor: "pointer",
                border: "none",
                letterSpacing: "-0.2px",
              }}
            >
              <span>BẮT ĐẦU HỌC NGAY</span>
              <span>→</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--gold)",
                  background: "var(--gold-d)",
                  padding: "4px 9px",
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--bd-gold)",
                }}
              >
                +60 XP
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--green)",
                  background: "var(--green-d)",
                  padding: "4px 9px",
                  borderRadius: "var(--r-xs)",
                  border: "1px solid rgba(16,185,129,.3)",
                }}
              >
                +{activeUnit.words || 15} Từ vựng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. CORE STATS ROW (Zero Duplication, High Contrast) ──────────── */}
      <div
        className="stats-row-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        {[
          {
            label: "Kinh nghiệm (XP)",
            val: `${user.xp.toLocaleString()} XP`,
            sub: `Cấp độ Lv.${user.level}`,
            icon: LOL_ICONS.xp,
            color: "var(--gold-light)",
            glow: "rgba(245,158,11,0.15)",
          },
          {
            label: "Từ vựng đã học",
            val: `${user.wordsLearned} từ`,
            sub: "Kho Codex",
            icon: LOL_ICONS.shield,
            color: "var(--purple-light)",
            glow: "rgba(139,92,246,0.15)",
          },
          {
            label: "Chuỗi liên tục",
            val: `${user.streak} ngày`,
            sub: user.streak > 0 ? "Giữ vững phong độ!" : "Bắt đầu chuỗi hôm nay",
            icon: LOL_ICONS.streak,
            color: "var(--red)",
            glow: "rgba(239,68,68,0.15)",
          },
          {
            label: "Kho báu Vàng",
            val: `${user.gold.toLocaleString()} G`,
            sub: "Dùng trong Cửa hàng",
            icon: LOL_ICONS.gold,
            color: "var(--gold)",
            glow: "rgba(245,158,11,0.15)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rpg-card"
            style={{
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "transform .15s, border-color .15s",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "var(--r)",
                background: stat.glow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <LoLIcon src={stat.icon} size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 700, textTransform: "uppercase" }}>
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: stat.color,
                  letterSpacing: "-0.4px",
                  lineHeight: 1.2,
                  marginTop: 2,
                }}
              >
                {stat.val}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 2 }}>
                {stat.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 3. MAIN SECTION: MISSIONS + CHARACTER / INVENTORY ───────────── */}
      <div
        className="dashboard-main-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* Column A: Daily Missions (Prominent, Compact 65-75px) */}
        <div
          className="rpg-card"
          style={{
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: "var(--t1)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🎯</span>
                <span>Nhiệm Vụ Hôm Nay</span>
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--t3)" }}>
                Hoàn thành để nhận thêm XP và Vàng nâng cấp nhân vật
              </p>
            </div>
            <span style={{ fontSize: 11, color: "var(--purple-light)", fontWeight: 700 }}>
              {missions.filter((m) => m.done_flag).length}/{missions.length} Xong
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {missions.map((m) => {
              const isCompleted = m.done_flag || m.done >= m.total;
              const pct = Math.min(100, Math.round((m.done / m.total) * 100));

              return (
                <div
                  key={m.id}
                  style={{
                    padding: "12px 16px",
                    background: isCompleted ? "rgba(16,185,129,0.06)" : "var(--bg-surface)",
                    border: `1px solid ${isCompleted ? "rgba(16,185,129,0.3)" : "var(--bd)"}`,
                    borderRadius: "var(--r)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    transition: "all .15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: isCompleted ? "var(--green)" : "var(--bg-card)",
                          border: `1.5px solid ${isCompleted ? "var(--green)" : "var(--bd2)"}`,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: "#fff",
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted ? "✓" : ""}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: isCompleted ? "var(--t3)" : "var(--t1)",
                          textDecoration: isCompleted ? "line-through" : "none",
                        }}
                      >
                        {m.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "monospace" }}>
                        {m.done}/{m.total}
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: isCompleted ? "var(--green)" : "var(--gold)",
                          background: isCompleted ? "var(--green-d)" : "var(--gold-d)",
                          padding: "2px 7px",
                          borderRadius: "var(--r-xs)",
                        }}
                      >
                        +{m.xp} XP
                      </span>
                    </div>
                  </div>

                  <Bar
                    pct={pct}
                    color={isCompleted ? "var(--green)" : "var(--indigo)"}
                    height={5}
                    glow={!isCompleted && pct > 0}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Column B: RPG Character Status & Motivating Inventory */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Character RPG Progression Card */}
          <div className="rpg-card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <ChampPortrait name={user.champion} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "var(--t1)" }}>
                    {user.name}
                  </span>
                  <Chip color="var(--gold)" bg="var(--gold-d)">
                    Lv.{user.level}
                  </Chip>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--purple-light)", fontWeight: 700, marginTop: 2 }}>
                  {user.class} · {user.hp}/{user.hpMax} HP
                </div>
              </div>
            </div>

            {/* Visual RPG XP Progression Bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 700, textTransform: "uppercase" }}>
                  Tiến trình cấp độ
                </span>
                <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 800, fontFamily: "monospace" }}>
                  {xpInLevel} / {xpNeeded} XP ({xpPct}%)
                </span>
              </div>
              <Bar pct={xpPct} color="var(--gold)" height={7} glow />
              <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 6, textAlign: "right" }}>
                Còn <strong style={{ color: "var(--t1)" }}>{xpRemaining} XP</strong> nữa để thăng cấp Lv.{user.level + 1}
              </div>
            </div>
          </div>

          {/* Equipped Items / Motivating Empty State */}
          <div className="rpg-card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--t1)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🎒 Trang Bị Đang Dùng
              </div>
              {equipped.length > 0 && (
                <button
                  onClick={() => onNav("inventory")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--purple-light)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Quản lý →
                </button>
              )}
            </div>

            {equipped.length === 0 ? (
              <div
                style={{
                  padding: "20px 16px",
                  textAlign: "center",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--r)",
                  border: "1px dashed var(--bd)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 24 }}>🎒</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t1)" }}>
                  Hành trang của hiệp sĩ đang trống
                </div>
                <p style={{ fontSize: 11.5, color: "var(--t3)", margin: 0, maxWidth: 260, lineHeight: 1.5 }}>
                  Hoàn thành nhiệm vụ để kiếm Vàng và trang bị các bảo vật hỗ trợ học tập đầu tiên.
                </p>
                <button
                  onClick={() => onNav("inventory")}
                  className="rpg-btn-primary"
                  style={{
                    marginTop: 4,
                    padding: "7px 16px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ĐẾN KHO ĐỒ NGAY
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {equipped.map((it) => {
                  const r = RARITY[it.rarity];
                  return (
                    <div
                      key={it.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        background: "var(--bg-surface)",
                        border: `1px solid ${r.border}`,
                        borderRadius: "var(--r-sm)",
                      }}
                    >
                      <ItemIcon id={it.lolItem} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "var(--t1)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {it.name}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--t3)" }}>{it.effect}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. GUEST SAVE PROGRESS CONVERSION CTA (If Guest) ───────────── */}
      {!isAuthenticated && (
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: "var(--r-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "var(--r)",
                background: "var(--indigo-d)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              🔐
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "var(--t1)" }}>
                LƯU GIỮ HÀNH TRÌNH CỦA BẠN
              </div>
              <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 2 }}>
                Bạn đang học với tư cách khách. Đăng ký tài khoản để lưu toàn bộ XP, từ vựng và bảo vệ chuỗi ngày học!
              </div>
            </div>
          </div>

          <Link
            to="/register"
            className="rpg-btn-primary"
            style={{
              padding: "10px 20px",
              borderRadius: "var(--r)",
              fontSize: 12.5,
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ĐĂNG KÝ & LƯU TIẾN TRÌNH →
          </Link>
        </div>
      )}

      {/* ─── 5. QUICK SHORTCUTS ROW ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "Tra từ điển Codex", nav: "codex", icon: LOL_ICONS.shield },
          { label: "Đấu trường Arena", nav: "arena", icon: LOL_ICONS.streak },
          { label: "Kho đồ & Cửa hàng", nav: "inventory", icon: LOL_ICONS.potion },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => onNav(action.nav)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              background: "var(--bg-surface)",
              border: "1px solid var(--bd)",
              borderRadius: "var(--r)",
              color: "var(--t2)",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.color = "var(--t1)";
              e.currentTarget.style.borderColor = "var(--bd2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.color = "var(--t2)";
              e.currentTarget.style.borderColor = "var(--bd)";
            }}
          >
            <LoLIcon src={action.icon} size={16} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

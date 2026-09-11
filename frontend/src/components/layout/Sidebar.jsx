import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NAV_ITEMS, LOL_ICONS } from '../../constants/gameData';
import { useAuthStore } from '../../context/authStore';
import ChampPortrait from '../common/ChampPortrait';
import Chip from '../common/Chip';
import LoLIcon from '../common/LoLIcon';

export default function Sidebar({ view, onViewChange, user, mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, logout } = useAuthStore();

  const displayName = authUser?.displayName || user?.name || 'Chiến Binh';
  const championName = authUser?.champion || user?.champion || 'Lux';

  const navIconMap = {
    home: LOL_ICONS.logo,
    learn: LOL_ICONS.battle,
    codex: LOL_ICONS.shield,
    arena: LOL_ICONS.streak,
    inventory: LOL_ICONS.potion,
  };

  const handleNavClick = (id) => {
    onViewChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`sidebar-container ${mobileOpen ? 'open' : ''}`}
      style={{
        width: 240,
        minWidth: 240,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--bd)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        zIndex: 40,
      }}
    >
      {/* 1. Brand Logo Header */}
      <div
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid var(--bd-subtle)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--r-sm)",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(99,102,241,.35)",
            border: "1px solid rgba(255,255,255,.15)",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <LoLIcon src={LOL_ICONS.logo} size={36} style={{ borderRadius: 0 }} />
        </div>
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: "var(--t1)",
              letterSpacing: "-.4px",
              lineHeight: 1.1,
            }}
          >
            EngJoy
          </div>
          <div
            style={{
              fontSize: 9,
              color: "var(--purple)",
              fontWeight: 800,
              letterSpacing: "0.8px",
              marginTop: 2,
              textTransform: "uppercase",
            }}
          >
            Learn · Play · Level Up
          </div>
        </div>
      </div>

      {/* 2. User Mini Profile Card */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--bd-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            background: "var(--bg-card)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r)",
          }}
        >
          <ChampPortrait name={championName} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "var(--t1)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--purple-light)",
                fontWeight: 600,
                marginTop: 1,
              }}
            >
              {user.class}
            </div>
          </div>
          <Chip color="var(--gold)" bg="var(--gold-d)">
            Lv.{user.level}
          </Chip>
        </div>
      </div>

      {/* 3. Navigation-Focused Links */}
      <nav
        style={{
          flex: 1,
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "var(--t3)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            padding: "0 10px 8px",
          }}
        >
          Menu Chính
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = view === item.id;
          const iconSrc = navIconMap[item.id] || LOL_ICONS.battle;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 0,
                border: isActive ? "1px solid rgba(34,211,238,.16)" : "1px solid transparent",
                borderLeft: isActive ? "4px solid #22d3ee" : "4px solid transparent",
                background: isActive
                  ? "linear-gradient(90deg, rgba(8,145,178,.32) 0%, rgba(8,47,73,.08) 100%)"
                  : "transparent",
                color: isActive ? "#ffffff" : "var(--t2)",
                fontWeight: isActive ? 800 : 600,
                fontSize: 13.5,
                cursor: "pointer",
                transition: "all .15s ease",
                textAlign: "left",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "linear-gradient(90deg, rgba(8,145,178,.16), rgba(8,47,73,.03))";
                  e.currentTarget.style.color = "var(--t1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--t2)";
                }
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "20%",
                    bottom: "20%",
                    width: 3,
                    borderRadius: "0 4px 4px 0",
                    background: "var(--indigo)",
                    boxShadow: "0 0 10px var(--indigo)",
                  }}
                />
              )}

              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isActive ? "var(--indigo-d)" : "transparent",
                  flexShrink: 0,
                }}
              >
                <LoLIcon src={iconSrc} size={17} />
              </div>

              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 4. Bottom Compact Action / Settings */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid var(--bd-subtle)",
          background: "var(--bg-surface)",
        }}
      >
        {isAuthenticated ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 600 }}>
                Đang trực tuyến
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                toast.success('Đã đăng xuất!');
                navigate('/login');
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--t3)",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: "var(--r-xs)",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--red)";
                e.currentTarget.style.background = "var(--red-d)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--t3)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <Link
            to="/register"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 12px",
              background: "linear-gradient(135deg, rgba(99,102,241,.15) 0%, rgba(139,92,246,.15) 100%)",
              border: "1px solid rgba(99,102,241,.3)",
              borderRadius: "var(--r-sm)",
              color: "var(--purple-light)",
              fontSize: 12,
              fontWeight: 800,
              textDecoration: "none",
              transition: "all .15s",
              textAlign: "center",
            }}
          >
            <span>🔐 Đăng ký lưu tiến trình</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

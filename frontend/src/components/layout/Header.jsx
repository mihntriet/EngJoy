import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NAV_ITEMS, LOL_ICONS } from '../../constants/gameData';
import { useAuthStore } from '../../context/authStore';
import { useProgressStore } from '../../context/progressStore';
import ChampPortrait from '../common/ChampPortrait';
import LoLIcon from '../common/LoLIcon';

export default function Header({ view, user, onViewChange, onToggleMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated, logout } = useAuthStore();
  const guestXp = useProgressStore((state) => state.xp || 0);
  const hasGuestProgress = !isAuthenticated && guestXp > 0;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentNav = NAV_ITEMS.find((n) => n.id === view);
  const displayName = authUser?.displayName || user?.name || 'Chiến Binh';
  const displayEmail = authUser?.email || 'khach@engjoy.edu.vn';
  const championName = authUser?.champion || user?.champion || 'Lux';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    toast.success('Đã đăng xuất khỏi tài khoản!');
    navigate('/login');
  };

  return (
    <header
      style={{
        height: 60,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--bd)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        flexShrink: 0,
        position: "relative",
        zIndex: 30,
      }}
    >
      {/* Mobile Hamburger toggle button */}
      {onToggleMobile && (
        <button
          onClick={onToggleMobile}
          className="mobile-only"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--bd)",
            borderRadius: 0,
            color: "var(--t1)",
            padding: "6px 10px",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Toggle Navigation"
        >
          ☰
        </button>
      )}

      {/* Page Title with sleek RPG icon indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "var(--t1)",
            letterSpacing: "-0.2px",
            margin: 0,
          }}
        >
          {currentNav?.label || "Tổng quan"}
        </h1>
      </div>

      {/* QA FIX 1: Codex owns its search surface; keep the global search on other routes. */}
      {location.pathname !== '/codex' && <div
        className="mobile-hide rpg-header-search"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-card)",
          border: "1px solid rgba(103,232,249,.18)",
          borderBottom: "2px solid rgba(34,211,238,.5)",
          borderRadius: 0,
          boxShadow: "inset 0 -5px 14px rgba(6,182,212,.07)",
          padding: "0 14px",
          height: 36,
          maxWidth: 320,
          marginLeft: 8,
          transition: "border-color .15s",
        }}
      >
        <svg width={14} height={14} viewBox="0 0 16 16" fill="none" style={{ opacity: 0.6 }}>
          <circle cx="7" cy="7" r="4.5" stroke="var(--t2)" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="var(--t2)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          placeholder="Tìm từ vựng, ngữ pháp, bài học..."
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 12.5,
            color: "var(--t1)",
            width: "100%",
          }}
        />
      </div>}

      {/* Right Stats Pills (Streak, XP, Gold) & Auth Section */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {/* Streak Pill */}
        <div
          className="mobile-hide"
          title={`${user.streak} ngày học liên tục`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            background: "var(--red-d)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <LoLIcon src={LOL_ICONS.streak} size={15} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--red)" }}>
            {user.streak}d
          </span>
        </div>

        {/* XP Pill */}
        <div
          className="mobile-hide"
          title={`Tổng XP: ${user.xp.toLocaleString()} XP`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            background: "var(--gold-d)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <LoLIcon src={LOL_ICONS.xp} size={15} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)" }}>
            {user.xp} XP
          </span>
        </div>

        {/* Gold Pill */}
        <div
          className="mobile-hide"
          title={`Kho báu: ${user.gold} vàng`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            background: "var(--purple-d)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <LoLIcon src={LOL_ICONS.potion} size={15} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--purple-light)" }}>
            {user.gold}
          </span>
        </div>

        {/* Auth Buttons or User Avatar Dropdown */}
        {isAuthenticated ? (
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "3px 6px 3px 3px",
                background: dropdownOpen ? "var(--bg-card-hover)" : "var(--bg-card)",
                border: "1px solid var(--bd)",
                borderRadius: 0,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              <ChampPortrait name={championName} size={30} />
              <span
                className="desktop-only"
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--t1)",
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </span>
              <svg width={10} height={6} viewBox="0 0 10 6" fill="none">
                <path d="M1 1L5 5L9 1" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 220,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bd2)",
                  borderRadius: 0,
                  boxShadow: "var(--sh-lg)",
                  padding: "8px",
                  zIndex: 100,
                  animation: "slide-up .15s ease",
                }}
              >
                <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--bd-subtle)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--t1)" }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {displayEmail}
                  </div>
                </div>
                <div style={{ padding: "4px 0" }}>
                  <button
                    onClick={() => { onViewChange('inventory'); setDropdownOpen(false); }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "transparent",
                      border: "none",
                      color: "var(--t2)",
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: "var(--r-xs)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.color = "var(--t1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t2)"; }}
                  >
                    Kho đồ & Trang bị
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "transparent",
                      border: "none",
                      color: "var(--red)",
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: "var(--r-xs)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--red-d)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              to="/login"
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--t2)",
                padding: "6px 12px",
                borderRadius: 0,
                textDecoration: "none",
                transition: "all .15s",
              }}
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="rpg-btn-primary"
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                padding: "6px 14px",
                borderRadius: 0,
                textDecoration: "none",
              }}
            >
              {hasGuestProgress ? 'Lưu Tiến Trình' : 'Đăng ký'}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

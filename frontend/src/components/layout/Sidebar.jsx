import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NAV_ITEMS, LOL_ICONS } from '../../constants/gameData';
import { useAuthStore } from '../../context/authStore';
import ChampPortrait from '../common/ChampPortrait';
import LoLIcon from '../common/LoLIcon';

const iconByView = {
  home: LOL_ICONS.logo,
  learn: LOL_ICONS.battle,
  codex: LOL_ICONS.shield,
  arena: LOL_ICONS.streak,
  inventory: LOL_ICONS.potion,
};

export default function Sidebar({ view, onViewChange, user, mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const expandedText = `whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`;
  const displayName = authUser?.displayName || user?.name || 'Chiến Binh';
  const champion = authUser?.champion || user?.champion || 'Lux';

  const selectView = (id) => {
    onViewChange(id);
    onCloseMobile?.();
  };

  return (
    <aside className={`sidebar-container hextech-sidebar ${isCollapsed ? 'w-20 is-collapsed' : 'w-64'} ${mobileOpen ? 'open' : ''} flex-shrink-0 flex flex-col h-full bg-gray-900 border-r border-gray-800 transition-[width] duration-300 relative z-40`}>
      <button
        type="button"
        className="sidebar-collapse-toggle absolute -right-4 top-1/2 -translate-y-1/2 z-50"
        onClick={() => setIsCollapsed((value) => !value)}
        aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
        aria-pressed={isCollapsed}
      >
        {isCollapsed ? '›' : '‹'}
      </button>

      <div className="sidebar-brand">
        <div className="sidebar-brand-mark"><LoLIcon src={LOL_ICONS.logo} size={34} /></div>
        <span className={`${expandedText} sidebar-brand-copy`}><strong>Eng<b>Joy</b></strong><small>LEARN · PLAY · LEVEL UP</small></span>
      </div>

      <div className="sidebar-profile">
        <ChampPortrait name={champion} size={38} />
        <span className={`${expandedText} sidebar-profile-copy`}><strong>{displayName}</strong><small>{user.class} · Lv.{user.level}</small></span>
      </div>

      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        <span className={`${expandedText} sidebar-section-label`}>MENU CHÍNH</span>
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <button key={item.id} type="button" className={`sidebar-nav-item ${active ? 'is-active' : ''}`} onClick={() => selectView(item.id)} title={isCollapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}>
              <LoLIcon src={iconByView[item.id] || LOL_ICONS.battle} size={18} />
              <span className={expandedText}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <footer className="sidebar-footer">
        {isAuthenticated ? (
          <button type="button" className="sidebar-session-action" onClick={() => { logout(); toast.success('Đã đăng xuất!'); navigate('/login'); }} title={isCollapsed ? 'Đăng xuất' : undefined}>
            <i aria-hidden="true" />
            <span className={expandedText}>Đăng xuất</span>
          </button>
        ) : (
          <Link to="/register" className="sidebar-session-action" title={isCollapsed ? 'Lưu tiến trình' : undefined}>
            <i aria-hidden="true">⌁</i>
            <span className={expandedText}>Lưu tiến trình</span>
          </Link>
        )}
      </footer>
    </aside>
  );
}

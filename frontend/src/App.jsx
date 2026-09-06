import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { INITIAL_USER, INITIAL_ITEMS, MISSIONS } from './constants/gameData';
import { useAuthStore } from './context/authStore';
import { useProgressStore, calculateLevelInfo } from './context/progressStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import JoyBubble from './components/chat/JoyBubble';
import Dashboard from './pages/Dashboard';
import Learning from './pages/Learning';
import Dictionary from './pages/Dictionary';
import Arena from './pages/Arena';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import Register from './pages/Register';

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated } = useAuthStore();
  const {
    xp,
    level,
    streak,
    gold,
    wordsLearned,
    missions,
    ownedItemIds,
    equippedIds,
    fetchUserProgress,
    buyItem,
    toggleEquip,
  } = useProgressStore();

  // Map route path to view ID
  const getViewFromPath = (pathname) => {
    if (pathname === '/learn') return 'learn';
    if (pathname === '/codex') return 'codex';
    if (pathname === '/arena') return 'arena';
    if (pathname === '/inventory') return 'inventory';
    return 'home';
  };

  const [view, setView] = useState(() => getViewFromPath(location.pathname));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(INITIAL_USER);

  // Sync state with location
  useEffect(() => {
    setView(getViewFromPath(location.pathname));
  }, [location.pathname]);

  // Fetch DB progress on auth
  useEffect(() => {
    if (authUser) {
      fetchUserProgress();
    }
  }, [authUser, fetchUserProgress]);

  // Derive persistent items from store
  const items = INITIAL_ITEMS.map((item) => ({
    ...item,
    owned: (ownedItemIds || []).some((id) => String(id) === String(item.id)),
    equipped: (equippedIds || []).some((id) => String(id) === String(item.id)),
  }));

  // Derived user stats from Dual-State progressStore
  const levelInfo = calculateLevelInfo(xp);
  const displayUser = {
    ...user,
    name: authUser?.displayName || (isAuthenticated ? 'Chiến Binh' : 'Tân Hiệp Sĩ (Khách)'),
    champion: authUser?.champion || user.champion || 'Lux',
    class: level >= 5 ? 'Master Scholar' : level >= 3 ? 'Adept Mage' : 'Novice Scholar',
    level: level,
    xp: levelInfo.xpInCurrentLevel,
    xpNext: levelInfo.xpNeededForNext,
    totalXp: xp,
    hp: 100,
    hpMax: 100,
    streak: streak,
    wordsLearned: wordsLearned,
    gold: gold,
    equippedIds: equippedIds || [],
  };

  const handleNav = (newView) => {
    setView(newView);
    setMobileOpen(false);
    const pathMap = {
      home: '/',
      learn: '/learn',
      codex: '/codex',
      arena: '/arena',
      inventory: '/inventory',
    };
    navigate(pathMap[newView] || '/');
  };

  const handleToggleEquip = (id) => {
    toggleEquip(id);
  };

  const handleBuyItem = (id, price) => {
    const it = INITIAL_ITEMS.find((i) => i.id === id);
    if (it) {
      buyItem(it);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "var(--bg)",
        fontFamily: "'Inter', sans-serif",
        color: "var(--t1)",
      }}
    >
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 990,
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* 1. Sidebar Navigation */}
      <Sidebar
        view={view}
        onViewChange={handleNav}
        user={displayUser}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* 2. Main Content Area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Header
          view={view}
          user={displayUser}
          onViewChange={handleNav}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />

        <div style={{ flex: 1, overflow: "hidden" }}>
          {view === "home" && (
            <Dashboard user={displayUser} items={items} missions={missions} onNav={handleNav} />
          )}
          {view === "learn" && <Learning />}
          {view === "codex" && <Dictionary />}
          {view === "arena" && <Arena />}
          {view === "inventory" && (
            <Inventory
              items={items}
              gold={displayUser.gold}
              onToggleEquip={handleToggleEquip}
              onBuyItem={handleBuyItem}
            />
          )}
        </div>
      </main>

      {/* 3. AI Coach Companion */}
      <JoyBubble />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}

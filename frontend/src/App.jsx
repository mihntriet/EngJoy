import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { INITIAL_USER, INITIAL_ITEMS, MISSIONS } from './constants/gameData';
import { useAuthStore } from './context/authStore';
import { useProgressStore, calculateLevelInfo } from './context/progressStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MigrationConflictBanner from './components/common/MigrationConflictBanner';
import JoyBubble from './components/chat/JoyBubble';
import Dashboard from './pages/Dashboard';
import Learning from './pages/Learning';
import Dictionary from './pages/Dictionary';
import Arena from './pages/Arena';
import Inventory from './pages/Inventory';
import Login from './pages/Login';
import Register from './pages/Register';

let bootstrapPromise = null;

/**
 * PHASE 2C.4C — Deterministic App Bootstrap / Reload Guest Migration Recovery
 * 
 * Safely recovers progression on startup or browser refresh:
 * - Unauthenticated: normal Guest startup (zero authenticated API calls)
 * - Authenticated + pendingGuestMigration: runs migrateGuestProgress() directly (NO fetchUserProgress() first)
 * - Authenticated + no pendingGuestMigration: runs normal fetchUserProgress()
 * - Concurrency: deduplicates simultaneous calls (e.g. React 18 StrictMode) via shared bootstrapPromise
 */
export async function bootstrapAppProgress() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  const authState = useAuthStore.getState();
  if (!authState.isAuthenticated || !authState.user) {
    return { status: 'unauthenticated' };
  }

  bootstrapPromise = (async () => {
    try {
      const progressStore = useProgressStore.getState();
      if (progressStore.pendingGuestMigration) {
        // Invariant C4-B10: Strictly migrate directly, DO NOT call fetchUserProgress() first
        const result = await progressStore.migrateGuestProgress();
        return { status: 'migrated', result };
      } else {
        await progressStore.fetchUserProgress();
        return { status: 'hydrated' };
      }
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

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
  const bootstrappedAuthRef = useRef(null);

  // Sync state with location
  useEffect(() => {
    setView(getViewFromPath(location.pathname));
  }, [location.pathname]);

  // Authenticated Bootstrap & Progression Recovery Flow
  useEffect(() => {
    if (!authUser || !isAuthenticated) {
      bootstrappedAuthRef.current = null;
      return;
    }

    const currentUserId = authUser.id || authUser.email;
    if (bootstrappedAuthRef.current === currentUserId) {
      return;
    }
    bootstrappedAuthRef.current = currentUserId;

    bootstrapAppProgress();
  }, [authUser?.id, authUser?.email, isAuthenticated]);

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

        {/* Global Migration Conflict Banner (Phase 2C.4D) */}
        <MigrationConflictBanner />

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

/**
 * EngJoy API & Resource Endpoints
 * ─────────────────────────────────────────────────────────────────────────────
 * Tập hợp toàn bộ endpoint của Backend API (Express) và LoL Riot Data Dragon API.
 * Tập trung quản lý URL tại một nơi duy nhất để dễ dàng bảo trì và mở rộng.
 */

// ─── 1. Backend REST API Endpoints ───────────────────────────────────────────
export const API_BASE_URL = '/api/v1';

export const BACKEND_ENDPOINTS = {
  // System Health
  HEALTH: '/health',

  // Authentication & Session
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },

  // User Management
  USERS: {
    BASE: '/users',
    LIST: '/users',
    BY_ID: (id) => `/users/${id}`,
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
  },

  // Learning Phases / Roadmap (A1, A2, B1, B2, C1, C2)
  PHASES: {
    BASE: '/phases',
    LIST: '/phases',
    BY_ID: (id) => `/phases/${id}`,
    BY_SLUG: (slug) => `/phases/slug/${slug}`,
    BY_LEVEL: (level) => `/phases/level/${level}`,
    CREATE: '/phases',
    UPDATE: (id) => `/phases/${id}`,
    DELETE: (id) => `/phases/${id}`,
  },

  // User Learning Progress & Game Stats
  PROGRESS: {
    BASE: '/progress',
    MY_PROGRESS: '/progress',
    PROFILE: '/progress/profile',
    ACTION: '/progress/action',
    STATS: '/progress/stats',
    BY_PHASE: (phaseId) => `/progress/phase/${phaseId}`,
    START: '/progress',
    SUBMIT_SCORE: '/progress/submit-score',
    UPDATE_LESSON: (id) => `/progress/${id}/lesson`,
    COMPLETE: (id) => `/progress/${id}/complete`,
    DELETE: (id) => `/progress/${id}`,
  },

  // Codex / English-Vietnamese Dictionary
  DICTIONARY: {
    BASE: '/dictionary',
    SEARCH: '/dictionary/search',
    RANDOM: '/dictionary/random',
    BY_LEVEL: (level) => `/dictionary/level/${level}`,
    BY_WORD: (word) => `/dictionary/word/${encodeURIComponent(word)}`,
    BY_ID: (id) => `/dictionary/${id}`,
    CREATE: '/dictionary',
    BULK_CREATE: '/dictionary/bulk',
    UPDATE: (id) => `/dictionary/${id}`,
    DELETE: (id) => `/dictionary/${id}`,
  },
};

// ─── 2. Riot Data Dragon & LoL API Endpoints ──────────────────────────────────
export const DDRAGON_VERSION = '16.17.1';
export const DDRAGON_CDN_BASE = 'https://ddragon.leagueoflegends.com/cdn';

export const RIOT_ENDPOINTS = {
  VERSION: DDRAGON_VERSION,
  CDN: DDRAGON_CDN_BASE,

  // Champion Visual Assets
  CHAMPION_SPLASH: (name, skin = 0) =>
    `${DDRAGON_CDN_BASE}/img/champion/splash/${name}_${skin}.jpg`,
  CHAMPION_LOADING: (name, skin = 0) =>
    `${DDRAGON_CDN_BASE}/img/champion/loading/${name}_${skin}.jpg`,
  CHAMPION_ICON: (name) =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/img/champion/${name}.png`,

  // Item & Spell Icons
  ITEM_ICON: (id) =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/img/item/${id}.png`,
  SPELL_ICON: (name) =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/img/spell/${name}.png`,
  PROFILE_ICON: (id) =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/img/profileicon/${id}.png`,

  // Data JSON API Endpoints (Champions, Items, Runes, Translations)
  CHAMPIONS_DATA: (lang = 'en_US') =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/data/${lang}/champion.json`,
  CHAMPION_DETAIL: (name, lang = 'en_US') =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/data/${lang}/champion/${name}.json`,
  ITEMS_DATA: (lang = 'en_US') =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/data/${lang}/item.json`,
  RUNES_DATA: (lang = 'en_US') =>
    `${DDRAGON_CDN_BASE}/${DDRAGON_VERSION}/data/${lang}/runesReforged.json`,
};

// ─── 3. Unified Global Endpoints Object ──────────────────────────────────────
export const ENDPOINTS = {
  API_BASE: API_BASE_URL,
  BACKEND: BACKEND_ENDPOINTS,
  AUTH: BACKEND_ENDPOINTS.AUTH,
  USERS: BACKEND_ENDPOINTS.USERS,
  PHASES: BACKEND_ENDPOINTS.PHASES,
  PROGRESS: BACKEND_ENDPOINTS.PROGRESS,
  DICTIONARY: BACKEND_ENDPOINTS.DICTIONARY,
  RIOT: RIOT_ENDPOINTS,
};

export default ENDPOINTS;

-- ============================================================
-- EngJoy – PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- ENUM TYPES (Idempotent Creation)
-- ------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'phase_status') THEN
        CREATE TYPE phase_status AS ENUM ('active', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'progress_status') THEN
        CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed');
    END IF;
END $$;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    display_name    VARCHAR(100)  NOT NULL,
    avatar_url      TEXT,
    role            user_role     NOT NULL DEFAULT 'student',
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active  ON users (is_active);

-- ------------------------------------------------------------
-- LEARNING PHASES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_phases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150)  NOT NULL,
    slug            VARCHAR(150)  NOT NULL UNIQUE,
    description     TEXT,
    phase_order     INT           NOT NULL DEFAULT 0,
    level           VARCHAR(10)   NOT NULL DEFAULT 'A1'
                        CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
    total_lessons   INT           NOT NULL DEFAULT 0,
    estimated_hours NUMERIC(5,1)  NOT NULL DEFAULT 0,
    status          phase_status  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_phases_order ON learning_phases (phase_order);
CREATE INDEX IF NOT EXISTS idx_learning_phases_level        ON learning_phases (level);
CREATE INDEX IF NOT EXISTS idx_learning_phases_status       ON learning_phases (status);

-- ------------------------------------------------------------
-- USER PROGRESS (Learning-Phase Specific Progress)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_progress (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phase_id            UUID            REFERENCES learning_phases(id) ON DELETE CASCADE,
    status              progress_status NOT NULL DEFAULT 'not_started',
    total_xp            INT             NOT NULL DEFAULT 0,
    current_level       INT             NOT NULL DEFAULT 1,
    streak_days         INT             NOT NULL DEFAULT 0,
    current_lesson      INT             NOT NULL DEFAULT 0,
    completed_lessons   INT             NOT NULL DEFAULT 0,
    score               NUMERIC(5,2)    NOT NULL DEFAULT 0.00
                            CHECK (score >= 0 AND score <= 100),
    time_spent_minutes  INT             NOT NULL DEFAULT 0,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    last_accessed_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_phase UNIQUE (user_id, phase_id)
);

-- Idempotent column additions for existing deployments
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS total_xp INT NOT NULL DEFAULT 0;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS current_level INT NOT NULL DEFAULT 1;
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS streak_days INT NOT NULL DEFAULT 0;
ALTER TABLE user_progress ALTER COLUMN phase_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id    ON user_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_phase_id   ON user_progress (phase_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status     ON user_progress (status);
CREATE INDEX IF NOT EXISTS idx_user_progress_total_xp   ON user_progress (total_xp);

-- ------------------------------------------------------------
-- PLAYER PROFILES (Dedicated Global RPG Progression - Phase 2)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp            INT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    current_level       INT NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    gold                INT NOT NULL DEFAULT 0 CHECK (gold >= 0),
    streak_days         INT NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    words_learned       INT NOT NULL DEFAULT 0 CHECK (words_learned >= 0),
    saved_words         TEXT[] NOT NULL DEFAULT '{}',
    missions            JSONB NOT NULL DEFAULT '[
        {"id": 1, "type": "words", "title": "Học 20 từ mới", "done": 0, "total": 20, "xp": 100, "done_flag": false},
        {"id": 2, "type": "quiz", "title": "Hoàn thành 1 quiz", "done": 0, "total": 1, "xp": 75, "done_flag": false},
        {"id": 3, "type": "chat", "title": "Luyện chatbot 5 câu", "done": 0, "total": 5, "xp": 50, "done_flag": false}
    ]'::jsonb,
    quest_units         JSONB NOT NULL DEFAULT '{}'::jsonb,
    owned_item_ids      TEXT[] NOT NULL DEFAULT '{}',
    equipped_ids        TEXT[] NOT NULL DEFAULT '{}',
    last_active_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    last_reset_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    last_chat_at        TIMESTAMPTZ,
    guest_migrated      BOOLEAN NOT NULL DEFAULT FALSE,
    migration_key       VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS last_chat_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_player_profiles_xp ON player_profiles (total_xp);

-- ------------------------------------------------------------
-- IDEMPOTENCY KEYS (Action & Migration Deduplication - Phase 2)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key         VARCHAR(255) NOT NULL,
    action_type VARCHAR(100),
    response    JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_idempotency_user_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_cleanup ON idempotency_keys (created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_user_key ON idempotency_keys (user_id, key);

-- ------------------------------------------------------------
-- LESSON ATTEMPTS (Server-Verified Progression - Phase 4A.4)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id        INT NOT NULL,
    unit_id         INT NOT NULL,
    question_ids    TEXT[] NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'failed', 'consumed')),
    score           INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_lesson_attempts_user_unit ON lesson_attempts (user_id, quest_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_lesson_attempts_status ON lesson_attempts (status);

-- ------------------------------------------------------------
-- AUTO-UPDATE updated_at TRIGGER
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_learning_phases_updated_at ON learning_phases;
CREATE TRIGGER trg_learning_phases_updated_at
    BEFORE UPDATE ON learning_phases
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_progress_updated_at ON user_progress;
CREATE TRIGGER trg_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_player_profiles_updated_at ON player_profiles;
CREATE TRIGGER trg_player_profiles_updated_at
    BEFORE UPDATE ON player_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ------------------------------------------------------------
-- BACKWARD COMPATIBILITY DATA SEEDING
-- ------------------------------------------------------------
-- Seed player_profiles for any existing users who do not yet have a profile row.
-- Inherit total_xp, current_level, streak_days from existing user_progress rows if available.
INSERT INTO player_profiles (
    user_id,
    total_xp,
    current_level,
    streak_days,
    guest_migrated,
    created_at,
    updated_at
)
SELECT 
    u.id AS user_id,
    COALESCE(MAX(up.total_xp), 0) AS total_xp,
    COALESCE(MAX(up.current_level), 1) AS current_level,
    COALESCE(MAX(up.streak_days), 0) AS streak_days,
    FALSE AS guest_migrated,
    NOW() AS created_at,
    NOW() AS updated_at
FROM users u
LEFT JOIN user_progress up ON up.user_id = u.id
WHERE NOT EXISTS (
    SELECT 1 FROM player_profiles pp WHERE pp.user_id = u.id
)
GROUP BY u.id;

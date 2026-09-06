const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { pool } = require('../config/db.postgres');
const userRepo = require('../repositories/user.repository');

class AuthService {
  /**
   * Đăng ký người dùng mới:
   * Chạy trong PostgreSQL Transaction:
   * 1. INSERT vào bảng users
   * 2. Lập tức INSERT bản ghi vào bảng user_progress với total_xp = 0, current_level = 1, streak_days = 0
   */
  async register({ email, password, displayName }) {
    const existing = await userRepo.findByEmail(email);
    if (existing) {
      const err = new Error('Email already registered');
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Tạo mới tài khoản user
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name, avatar_url, role, is_active, created_at`,
        [email, passwordHash, displayName, 'student']
      );
      const user = userRes.rows[0];

      // 2. Tìm phase khởi đầu (nếu có trong DB)
      const phaseRes = await client.query(
        `SELECT id FROM learning_phases ORDER BY phase_order ASC LIMIT 1`
      );
      const initialPhaseId = phaseRes.rows[0]?.id || null;

      // 3. Khởi tạo bản ghi user_progress từ số 0
      await client.query(
        `INSERT INTO user_progress (
           user_id,
           phase_id,
           status,
           total_xp,
           current_level,
           streak_days,
           current_lesson,
           completed_lessons,
           score,
           time_spent_minutes,
           started_at
         )
         VALUES ($1, $2, 'not_started', 0, 1, 0, 0, 0, 0, 0, NOW())
         ON CONFLICT (user_id, phase_id) DO NOTHING`,
        [user.id, initialPhaseId]
      );

      // 4. Khởi tạo bản ghi player_profiles cho global RPG state
      await client.query(
        `INSERT INTO player_profiles (
           user_id,
           total_xp,
           current_level,
           gold,
           streak_days,
           words_learned,
           saved_words,
           quest_units,
           owned_item_ids,
           equipped_ids,
           guest_migrated
         )
         VALUES ($1, 0, 1, 0, 0, 0, '{}', '{}', '{}', '{}', FALSE)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      await client.query('COMMIT');

      const tokens = this._generateTokens(user);
      return {
        user: {
          ...user,
          total_xp: 0,
          current_level: 1,
          streak_days: 0,
        },
        ...tokens,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async login({ email, password }) {
    const user = await userRepo.findByEmail(email);
    if (!user || !user.is_active) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    await userRepo.updateLastLogin(user.id);
    const tokens = this._generateTokens(user);

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await userRepo.findById(decoded.id);
      if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }
      return this._generateTokens(user);
    } catch (err) {
      if (err.statusCode) throw err;
      const error = new Error('Invalid refresh token');
      error.statusCode = 401;
      throw error;
    }
  }

  _generateTokens(user) {
    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const refreshToken = jwt.sign({ id: user.id }, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn });
    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();

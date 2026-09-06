const { pool } = require('../config/db.postgres');

class UserRepository {
  async findAll({ limit = 20, offset = 0 } = {}) {
    const { rows } = await pool.query(
      `SELECT id, email, display_name, avatar_url, role, is_active, email_verified, last_login_at, created_at, updated_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, email, display_name, avatar_url, role, is_active, email_verified, last_login_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  }

  async create({ email, passwordHash, displayName, role = 'student' }) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, avatar_url, role, is_active, created_at`,
      [email, passwordHash, displayName, role]
    );
    return rows[0];
  }

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(id);

    const sets = keys.map((k, i) => `${this._toSnake(k)} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);

    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $1
       RETURNING id, email, display_name, avatar_url, role, is_active, email_verified, updated_at`,
      [id, ...values]
    );
    return rows[0] || null;
  }

  async delete(id) {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async updateLastLogin(id) {
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  }

  async count() {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM users');
    return rows[0].total;
  }

  _toSnake(str) {
    return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  }
}

module.exports = new UserRepository();

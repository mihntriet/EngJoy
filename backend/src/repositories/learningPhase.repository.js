const { pool } = require('../config/db.postgres');

class LearningPhaseRepository {
  async findAll({ status = 'active' } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM learning_phases WHERE status = $1 ORDER BY phase_order ASC`,
      [status]
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM learning_phases WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async findBySlug(slug) {
    const { rows } = await pool.query('SELECT * FROM learning_phases WHERE slug = $1', [slug]);
    return rows[0] || null;
  }

  async findByLevel(level) {
    const { rows } = await pool.query(
      `SELECT * FROM learning_phases WHERE level = $1 AND status = 'active' ORDER BY phase_order ASC`,
      [level]
    );
    return rows;
  }

  async create({ name, slug, description, phaseOrder, level, totalLessons, estimatedHours }) {
    const { rows } = await pool.query(
      `INSERT INTO learning_phases (name, slug, description, phase_order, level, total_lessons, estimated_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, description, phaseOrder, level, totalLessons, estimatedHours]
    );
    return rows[0];
  }

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(id);

    const sets = keys.map((k, i) => `${this._toSnake(k)} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);

    const { rows } = await pool.query(
      `UPDATE learning_phases SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0] || null;
  }

  async delete(id) {
    const { rowCount } = await pool.query('DELETE FROM learning_phases WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async count({ status = 'active' } = {}) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM learning_phases WHERE status = $1',
      [status]
    );
    return rows[0].total;
  }

  _toSnake(str) {
    return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  }
}

module.exports = new LearningPhaseRepository();

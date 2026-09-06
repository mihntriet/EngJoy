const { pool } = require('../config/db.postgres');

class UserProgressRepository {
  async findByUser(userId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await pool.query(
      `SELECT up.*, lp.name AS phase_name, lp.level, lp.total_lessons
       FROM user_progress up
       JOIN learning_phases lp ON lp.id = up.phase_id
       WHERE up.user_id = $1
       ORDER BY lp.phase_order ASC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  }

  async findByUserAndPhase(userId, phaseId) {
    const { rows } = await pool.query(
      `SELECT up.*, lp.name AS phase_name, lp.level, lp.total_lessons
       FROM user_progress up
       JOIN learning_phases lp ON lp.id = up.phase_id
       WHERE up.user_id = $1 AND up.phase_id = $2`,
      [userId, phaseId]
    );
    return rows[0] || null;
  }

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT up.*, lp.name AS phase_name, lp.level, lp.total_lessons
       FROM user_progress up
       JOIN learning_phases lp ON lp.id = up.phase_id
       WHERE up.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async create({ userId, phaseId }) {
    const { rows } = await pool.query(
      `INSERT INTO user_progress (user_id, phase_id, status, started_at)
       VALUES ($1, $2, 'in_progress', NOW())
       RETURNING *`,
      [userId, phaseId]
    );
    return rows[0];
  }

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return this.findById(id);

    const sets = keys.map((k, i) => `${this._toSnake(k)} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);

    const { rows } = await pool.query(
      `UPDATE user_progress SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0] || null;
  }

  async completeProgress(userId, id, score) {
    const { rows } = await pool.query(
      `UPDATE user_progress
       SET status = 'completed', score = $3, completed_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, score]
    );
    return rows[0] || null;
  }

  async updateLesson(userId, id, currentLesson, completedLessons, timeSpent) {
    const { rows } = await pool.query(
      `UPDATE user_progress
       SET current_lesson = $3, completed_lessons = $4, time_spent_minutes = time_spent_minutes + $5, last_accessed_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, currentLesson, completedLessons, timeSpent]
    );
    return rows[0] || null;
  }

  async delete(userId, id) {
    const { rowCount } = await pool.query('DELETE FROM user_progress WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount > 0;
  }

  async getStatsByUser(userId) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int                                           AS total_phases,
         COUNT(*) FILTER (WHERE status = 'completed')::int      AS completed_phases,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int    AS in_progress_phases,
         COALESCE(SUM(time_spent_minutes), 0)::int              AS total_time_minutes,
         COALESCE(AVG(score) FILTER (WHERE status = 'completed'), 0)::numeric(5,2) AS avg_score
       FROM user_progress WHERE user_id = $1`,
      [userId]
    );
    return rows[0];
  }

  _toSnake(str) {
    return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  }
}

module.exports = new UserProgressRepository();

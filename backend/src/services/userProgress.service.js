const progressRepo = require('../repositories/userProgress.repository');

class UserProgressService {
  async getByUser(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    return progressRepo.findByUser(userId, { limit, offset });
  }

  async getByUserAndPhase(userId, phaseId) {
    const progress = await progressRepo.findByUserAndPhase(userId, phaseId);
    if (!progress) {
      const err = new Error('Progress record not found');
      err.statusCode = 404;
      throw err;
    }
    return progress;
  }

  async startPhase(userId, phaseId) {
    const existing = await progressRepo.findByUserAndPhase(userId, phaseId);
    if (existing) {
      const err = new Error('Progress already exists for this phase');
      err.statusCode = 409;
      throw err;
    }
    return progressRepo.create({ userId, phaseId });
  }

  async updateLesson(userId, id, { currentLesson, completedLessons, timeSpent }) {
    const progress = await progressRepo.updateLesson(userId, id, currentLesson, completedLessons, timeSpent);
    if (!progress) {
      const err = new Error('Progress record not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    return progress;
  }

  async complete(userId, id, score) {
    const progress = await progressRepo.completeProgress(userId, id, score);
    if (!progress) {
      const err = new Error('Progress record not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    return progress;
  }

  async getStats(userId) {
    return progressRepo.getStatsByUser(userId);
  }

  async delete(userId, id) {
    const deleted = await progressRepo.delete(userId, id);
    if (!deleted) {
      const err = new Error('Progress record not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    return true;
  }
}

module.exports = new UserProgressService();

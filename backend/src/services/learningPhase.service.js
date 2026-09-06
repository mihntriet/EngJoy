const phaseRepo = require('../repositories/learningPhase.repository');

class LearningPhaseService {
  async getAll({ status = 'active' } = {}) {
    return phaseRepo.findAll({ status });
  }

  async getById(id) {
    const phase = await phaseRepo.findById(id);
    if (!phase) {
      const err = new Error('Learning phase not found');
      err.statusCode = 404;
      throw err;
    }
    return phase;
  }

  async getBySlug(slug) {
    const phase = await phaseRepo.findBySlug(slug);
    if (!phase) {
      const err = new Error('Learning phase not found');
      err.statusCode = 404;
      throw err;
    }
    return phase;
  }

  async getByLevel(level) {
    return phaseRepo.findByLevel(level);
  }

  async create(data) {
    return phaseRepo.create(data);
  }

  async update(id, data) {
    const phase = await phaseRepo.update(id, data);
    if (!phase) {
      const err = new Error('Learning phase not found');
      err.statusCode = 404;
      throw err;
    }
    return phase;
  }

  async delete(id) {
    const deleted = await phaseRepo.delete(id);
    if (!deleted) {
      const err = new Error('Learning phase not found');
      err.statusCode = 404;
      throw err;
    }
    return true;
  }
}

module.exports = new LearningPhaseService();

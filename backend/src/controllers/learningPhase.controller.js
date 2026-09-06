const phaseService = require('../services/learningPhase.service');
const ApiResponse = require('../utils/apiResponse');

class LearningPhaseController {
  async getAll(req, res, next) {
    try {
      const status = req.query.status || 'active';
      const phases = await phaseService.getAll({ status });
      return ApiResponse.success(res, { data: phases });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const phase = await phaseService.getById(req.params.id);
      return ApiResponse.success(res, { data: phase });
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req, res, next) {
    try {
      const phase = await phaseService.getBySlug(req.params.slug);
      return ApiResponse.success(res, { data: phase });
    } catch (err) {
      next(err);
    }
  }

  async getByLevel(req, res, next) {
    try {
      const phases = await phaseService.getByLevel(req.params.level);
      return ApiResponse.success(res, { data: phases });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const phase = await phaseService.create(req.body);
      return ApiResponse.created(res, { data: phase });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const phase = await phaseService.update(req.params.id, req.body);
      return ApiResponse.success(res, { data: phase, message: 'Phase updated' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await phaseService.delete(req.params.id);
      return ApiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LearningPhaseController();

const progressService = require('../services/userProgress.service');
const ApiResponse = require('../utils/apiResponse');

class UserProgressController {
  async getMyProgress(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const progress = await progressService.getByUser(req.user.id, { page, limit });
      return ApiResponse.success(res, { data: progress });
    } catch (err) {
      next(err);
    }
  }

  async getByPhase(req, res, next) {
    try {
      const progress = await progressService.getByUserAndPhase(req.user.id, req.params.phaseId);
      return ApiResponse.success(res, { data: progress });
    } catch (err) {
      next(err);
    }
  }

  async startPhase(req, res, next) {
    try {
      const progress = await progressService.startPhase(req.user.id, req.body.phaseId);
      return ApiResponse.created(res, { data: progress, message: 'Phase started' });
    } catch (err) {
      next(err);
    }
  }

  async updateLesson(req, res, next) {
    try {
      const progress = await progressService.updateLesson(req.user.id, req.params.id, req.body);
      return ApiResponse.success(res, { data: progress, message: 'Lesson progress updated' });
    } catch (err) {
      next(err);
    }
  }

  async complete(req, res, next) {
    try {
      const progress = await progressService.complete(req.user.id, req.params.id, req.body.score);
      return ApiResponse.success(res, { data: progress, message: 'Phase completed' });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await progressService.getStats(req.user.id);
      return ApiResponse.success(res, { data: stats });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await progressService.delete(req.user.id, req.params.id);
      return ApiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserProgressController();

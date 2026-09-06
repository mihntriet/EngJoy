const progressService = require('../services/progress.service');
const ApiResponse = require('../utils/apiResponse');
const Joi = require('joi');

const submitScoreSchema = Joi.object({
  phaseId: Joi.string().uuid().optional().allow(null, ''),
  score: Joi.number().min(0).max(100).default(100),
  earnedXp: Joi.number().integer().min(0).max(500).default(0),
  timeSpent: Joi.number().integer().min(0).max(1440).default(0),
});

const actionSchema = Joi.object({
  action: Joi.string()
    .valid('COMPLETE_UNIT', 'COMPLETE_QUIZ', 'SAVE_WORD', 'CHAT_MESSAGE', 'BUY_ITEM')
    .required(),
  idempotencyKey: Joi.string().max(255).optional().allow(null, ''),
  questId: Joi.number().integer().min(1).max(6).optional(),
  unitId: Joi.number().integer().min(1).max(30).optional(),
  score: Joi.number().min(0).max(100).optional(),
  word: Joi.string().max(100).optional().allow(''),
  message: Joi.string().max(2000).optional().allow(''),
  itemId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
});

class ProgressController {
  /**
   * POST /api/v1/progress/action
   * Server-authoritative action execution (Phase 2B.1)
   */
  async handleAction(req, res, next) {
    try {
      const { error, value } = actionSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true, // Strips any client-supplied earnedXp, gold, level, etc.
      });

      if (error) {
        const errors = error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        }));
        return ApiResponse.badRequest(res, 'Validation failed', errors);
      }

      const result = await progressService.executeAction(req.user.id, value);

      return ApiResponse.success(res, {
        data: result,
        message: `Action ${value.action} executed successfully`,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
        });
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/progress/profile
   * Returns authoritative global RPG profile
   */
  async getProfile(req, res, next) {
    try {
      const profile = await progressService.getProfile(req.user.id);
      return ApiResponse.success(res, { data: profile });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/progress/submit-score (Legacy compatibility wrapper)
   * Body: { phaseId, score, timeSpent? }
   */
  async submitScore(req, res, next) {
    try {
      const { error, value } = submitScoreSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        }));
        return ApiResponse.badRequest(res, 'Validation failed', errors);
      }

      const { phaseId, score, timeSpent, earnedXp } = value;
      const result = await progressService.submitScore(req.user.id, phaseId, score, timeSpent, earnedXp);

      const message = result.levelUp
        ? `Tăng cấp độ mới: Cấp ${result.levelUp.from} → Cấp ${result.levelUp.to}!`
        : `Ghi nhận thành công +${result.earnedXp || earnedXp || 0} XP`;

      return ApiResponse.success(res, {
        data: {
          progress: result.progress,
          totalXp: result.totalXp,
          currentLevel: result.currentLevel,
          streakDays: result.streakDays,
          passed: result.passed,
          levelUp: result.levelUp,
          nextPhase: result.nextPhase,
          earnedXp: result.earnedXp || earnedXp || 0,
        },
        message,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/progress/stats (Legacy compatibility endpoint)
   */
  async getStats(req, res, next) {
    try {
      const stats = await progressService.getUserStats(req.user.id);
      return ApiResponse.success(res, { data: stats });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProgressController();

const progressService = require('../services/progress.service');
const ApiResponse = require('../utils/apiResponse');
const Joi = require('joi');

const submitScoreSchema = Joi.object({
  phaseId: Joi.string().uuid().optional().allow(null, ''),
  score: Joi.number().min(0).max(100).default(100),
  earnedXp: Joi.number().integer().min(0).max(500).default(0),
  timeSpent: Joi.number().integer().min(0).max(1440).default(0),
});

const startLessonSchema = Joi.object({
  questId: Joi.number().integer().min(1).max(6).required(),
  unitId: Joi.number().integer().min(1).max(30).required(),
});

const submitLessonSchema = Joi.object({
  attemptId: Joi.string().uuid().required(),
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().required(),
      selected: Joi.number().integer().min(0).max(10).required(),
    })
  ).min(1).required(),
  idempotencyKey: Joi.string().max(255).optional().allow(null, ''),
  score: Joi.any().strip(),
  earnedXp: Joi.any().strip(),
  gold: Joi.any().strip(),
  wordsLearned: Joi.any().strip(),
});

const actionSchema = Joi.object({
  action: Joi.string()
    .valid('START_LESSON', 'SUBMIT_LESSON', 'COMPLETE_UNIT', 'COMPLETE_QUIZ', 'SAVE_WORD', 'CHAT_MESSAGE', 'BUY_ITEM', 'EQUIP_ITEM')
    .required(),
  idempotencyKey: Joi.string().max(255).optional().allow(null, ''),
  attemptId: Joi.string().uuid().optional().allow(null, ''),
  questId: Joi.number().integer().min(1).max(6).optional(),
  unitId: Joi.number().integer().min(1).max(30).optional(),
  answers: Joi.array().items(
    Joi.object({
      questionId: Joi.string().required(),
      selected: Joi.number().integer().min(0).max(10).required(),
    })
  ).optional(),
  score: Joi.number().min(0).max(100).optional(),
  word: Joi.string().max(100).optional().allow(''),
  message: Joi.string().max(2000).optional().allow(''),
  itemId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  equippedIds: Joi.any().strip(),
  equipped_ids: Joi.any().strip(),
  earnedXp: Joi.any().strip(),
  gold: Joi.any().strip(),
  wordsLearned: Joi.any().strip(),
});

const snapshotTransportSchema = Joi.object({
  migrationKey: Joi.string().trim().max(255).optional(),
  xp: Joi.number().integer().min(0).max(100000).optional(),
  totalXp: Joi.number().integer().min(0).max(100000).optional(),
  gold: Joi.number().integer().min(0).max(100000).optional(),
  streak: Joi.number().integer().min(0).max(365).optional(),
  streakDays: Joi.number().integer().min(0).max(365).optional(),
  wordsLearned: Joi.number().integer().min(0).max(10000).optional(),
  savedWords: Joi.array().items(Joi.string().max(100)).max(500).optional(),
  questUnits: Joi.object().max(20).optional(),
  ownedItemIds: Joi.array().items(Joi.alternatives().try(Joi.string().max(50), Joi.number())).max(50).optional(),
  equippedIds: Joi.array().items(Joi.alternatives().try(Joi.string().max(50), Joi.number())).max(10).optional(),
  missions: Joi.array().items(Joi.object()).max(20).optional(),
  snapshotAt: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  completedLessons: Joi.array().optional(),
  unlockedQuests: Joi.array().optional(),
  lastResetDate: Joi.string().max(50).optional(),
  earnedXp: Joi.forbidden(),
  goldEarned: Joi.forbidden(),
  missionBonusXp: Joi.forbidden(),
  currentLevel: Joi.forbidden(),
  goldAfter: Joi.forbidden(),
  reward: Joi.forbidden(),
  price: Joi.forbidden(),
}).unknown(false);

const migrateGuestSchema = Joi.object({
  migrationKey: Joi.string().trim().min(1).max(255).regex(/^[a-zA-Z0-9_-]{1,255}$/).required(),
  snapshot: snapshotTransportSchema.optional().default({}),
  userId: Joi.any().strip(),
  user_id: Joi.any().strip(),
  accountId: Joi.any().strip(),
  earnedXp: Joi.forbidden(),
  goldEarned: Joi.forbidden(),
  missionBonusXp: Joi.forbidden(),
  currentLevel: Joi.forbidden(),
  goldAfter: Joi.forbidden(),
  reward: Joi.forbidden(),
  price: Joi.forbidden(),
}).unknown(true);

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
   * POST /api/v1/progress/lesson/start
   * Start a server-verified lesson attempt (Phase 4A.4)
   */
  async startLesson(req, res, next) {
    try {
      const { error, value } = startLessonSchema.validate(req.body, {
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

      const result = await progressService.startLesson(req.user.id, value);

      return ApiResponse.success(res, {
        data: result,
        message: 'Lesson attempt started successfully',
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
   * POST /api/v1/progress/lesson/submit
   * Submit lesson answers for server-side scoring & reward gating (Phase 4A.4)
   */
  async submitLesson(req, res, next) {
    try {
      const { error, value } = submitLessonSchema.validate(req.body, {
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

      const result = await progressService.submitLesson(req.user.id, value);

      return ApiResponse.success(res, {
        data: result,
        message: result.passed ? 'Lesson completed successfully' : 'Lesson failed',
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

  /**
   * POST /api/v1/progress/migrate-guest
   * Migrates guest progression into authenticated user's player profile (Phase 2C.3)
   */
  async migrateGuest(req, res, next) {
    try {
      const { error, value } = migrateGuestSchema.validate(req.body, {
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

      const rawSnapshot = {
        ...(value.snapshot || {}),
        migrationKey: value.migrationKey,
      };

      const result = await progressService.migrateGuestProgress(req.user.id, rawSnapshot);

      return ApiResponse.success(res, {
        data: result,
        message: result.alreadyMigrated
          ? 'Guest progress already migrated'
          : 'Guest progress migrated successfully',
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          success: false,
          error: err.message,
          message: err.message,
        });
      }
      next(err);
    }
  }
}

module.exports = new ProgressController();

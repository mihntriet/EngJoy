const dictCacheService = require('../services/dict.service');
const dictCrudService = require('../services/dictionary.service');
const ApiResponse = require('../utils/apiResponse');

class DictionaryController {
  async lookup(req, res, next) {
    try {
      const entry = await dictCacheService.getDefinition(req.params.word);
      return ApiResponse.success(res, { data: entry });
    } catch (err) {
      next(err);
    }
  }

  async search(req, res, next) {
    try {
      const { q, page, limit } = req.query;
      if (!q) return ApiResponse.badRequest(res, 'Query parameter "q" is required');
      const result = await dictCrudService.search(q, {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
      });
      return ApiResponse.success(res, {
        data: result.docs,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
    } catch (err) {
      next(err);
    }
  }

  async getByLevel(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await dictCrudService.getByLevel(req.params.level, { page, limit });
      return ApiResponse.success(res, {
        data: result.docs,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const entry = await dictCrudService.getById(req.params.id);
      return ApiResponse.success(res, { data: entry });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const entry = await dictCrudService.create(req.body);
      return ApiResponse.created(res, { data: entry });
    } catch (err) {
      next(err);
    }
  }

  async bulkCreate(req, res, next) {
    try {
      const entries = await dictCrudService.bulkCreate(req.body.entries);
      return ApiResponse.created(res, { data: entries, message: `${entries.length} entries created` });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const entry = await dictCrudService.update(req.params.id, req.body);
      if (entry && entry.word) {
        await dictCacheService.invalidate(entry.word);
      }
      return ApiResponse.success(res, { data: entry, message: 'Entry updated' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const entry = await dictCrudService.delete(req.params.id);
      if (entry && entry.word) {
        await dictCacheService.invalidate(entry.word);
      }
      return ApiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }

  async random(req, res, next) {
    try {
      const level = req.query.level || undefined;
      const count = parseInt(req.query.count, 10) || 10;
      const words = await dictCrudService.getRandomWords({ level, count });
      return ApiResponse.success(res, { data: words });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DictionaryController();


const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');

class UserController {
  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await userService.getAll({ page, limit });
      return ApiResponse.success(res, {
        data: result.users,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getById(req.params.id);
      return ApiResponse.success(res, { data: user });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body);
      return ApiResponse.success(res, { data: user, message: 'User updated' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await userService.delete(req.params.id);
      return ApiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();

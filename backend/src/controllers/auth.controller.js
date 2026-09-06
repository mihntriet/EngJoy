const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.created(res, { data: result, message: 'Registration successful' });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return ApiResponse.success(res, { data: result, message: 'Login successful' });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      return ApiResponse.success(res, { data: tokens, message: 'Token refreshed' });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const userService = require('../services/user.service');
      const user = await userService.getById(req.user.id);
      return ApiResponse.success(res, { data: user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

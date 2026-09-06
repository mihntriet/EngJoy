const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.unauthorized(res, 'Access token is missing');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token has expired');
    }
    return ApiResponse.unauthorized(res, 'Invalid token');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res);
    }
    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, 'Insufficient permissions');
    }
    next();
  };
};

module.exports = { authMiddleware, authorize };

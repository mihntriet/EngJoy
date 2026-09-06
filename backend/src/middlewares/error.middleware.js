const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, _next) => {
  logger.error(`${err.message}`, { stack: err.stack, path: req.path, method: req.method });

  if (err.name === 'ValidationError') {
    return ApiResponse.badRequest(res, 'Validation Error', err.details || err.message);
  }

  if (err.code === '23505') {
    return ApiResponse.conflict(res, 'Duplicate entry');
  }

  if (err.code === '23503') {
    return ApiResponse.badRequest(res, 'Referenced record not found');
  }

  if (err.name === 'CastError') {
    return ApiResponse.badRequest(res, `Invalid ${err.path}: ${err.value}`);
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  return ApiResponse.error(res, { message, statusCode });
};

module.exports = errorMiddleware;

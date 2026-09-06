class ApiResponse {
  static success(res, { data = null, message = 'Success', statusCode = 200, meta = null }) {
    const payload = { success: true, message, data };
    if (meta) payload.meta = meta;
    return res.status(statusCode).json(payload);
  }

  static created(res, { data = null, message = 'Created' }) {
    return ApiResponse.success(res, { data, message, statusCode: 201 });
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(res, { message = 'Internal Server Error', statusCode = 500, errors = null }) {
    const payload = { success: false, message };
    if (errors) payload.errors = errors;
    return res.status(statusCode).json(payload);
  }

  static badRequest(res, message = 'Bad Request', errors = null) {
    return ApiResponse.error(res, { message, statusCode: 400, errors });
  }

  static unauthorized(res, message = 'Unauthorized') {
    return ApiResponse.error(res, { message, statusCode: 401 });
  }

  static forbidden(res, message = 'Forbidden') {
    return ApiResponse.error(res, { message, statusCode: 403 });
  }

  static notFound(res, message = 'Not Found') {
    return ApiResponse.error(res, { message, statusCode: 404 });
  }

  static conflict(res, message = 'Conflict') {
    return ApiResponse.error(res, { message, statusCode: 409 });
  }
}

module.exports = ApiResponse;

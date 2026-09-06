const ApiResponse = require('../utils/apiResponse');

const validate = (schema) => {
  return (req, res, next) => {
    const targets = {};
    if (schema.body) targets.body = req.body;
    if (schema.params) targets.params = req.params;
    if (schema.query) targets.query = req.query;

    for (const [key, joiSchema] of Object.entries(schema)) {
      const { error, value } = joiSchema.validate(targets[key], { abortEarly: false, stripUnknown: true });
      if (error) {
        const errors = error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        }));
        return ApiResponse.badRequest(res, 'Validation failed', errors);
      }
      req[key] = value;
    }

    next();
  };
};

module.exports = validate;

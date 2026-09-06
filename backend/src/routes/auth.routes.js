const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const Joi = require('joi');

const router = Router();

const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    displayName: Joi.string().min(2).max(100).required(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

router.post('/register', validate(registerSchema), ctrl.register.bind(ctrl));
router.post('/login', validate(loginSchema), ctrl.login.bind(ctrl));
router.post('/refresh', validate(refreshSchema), ctrl.refresh.bind(ctrl));
router.get('/me', authMiddleware, ctrl.me.bind(ctrl));

module.exports = router;

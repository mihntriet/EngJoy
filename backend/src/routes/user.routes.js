const { Router } = require('express');
const ctrl = require('../controllers/user.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/', authorize('admin'), ctrl.getAll.bind(ctrl));
router.get('/:id', ctrl.getById.bind(ctrl));
router.put('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', authorize('admin'), ctrl.delete.bind(ctrl));

module.exports = router;

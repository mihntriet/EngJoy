const { Router } = require('express');
const ctrl = require('../controllers/dictionary.controller');
const { authMiddleware, authorize } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/search', ctrl.search.bind(ctrl));
router.get('/random', ctrl.random.bind(ctrl));
router.get('/level/:level', ctrl.getByLevel.bind(ctrl));
router.get('/word/:word', ctrl.lookup.bind(ctrl));
router.get('/:id', ctrl.getById.bind(ctrl));

router.use(authMiddleware);
router.post('/', authorize('admin', 'teacher'), ctrl.create.bind(ctrl));
router.post('/bulk', authorize('admin'), ctrl.bulkCreate.bind(ctrl));
router.put('/:id', authorize('admin', 'teacher'), ctrl.update.bind(ctrl));
router.delete('/:id', authorize('admin'), ctrl.delete.bind(ctrl));

module.exports = router;

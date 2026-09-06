const { Router } = require('express');
const ctrl = require('../controllers/userProgress.controller');
const progressCtrl = require('../controllers/progress.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/', ctrl.getMyProgress.bind(ctrl));
router.get('/profile', progressCtrl.getProfile.bind(progressCtrl));
router.get('/stats', progressCtrl.getStats.bind(progressCtrl));
router.get('/phase/:phaseId', ctrl.getByPhase.bind(ctrl));
router.post('/', ctrl.startPhase.bind(ctrl));
router.post('/action', progressCtrl.handleAction.bind(progressCtrl));
router.post('/submit-score', progressCtrl.submitScore.bind(progressCtrl));
router.put('/:id/lesson', ctrl.updateLesson.bind(ctrl));
router.put('/:id/complete', ctrl.complete.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));

module.exports = router;


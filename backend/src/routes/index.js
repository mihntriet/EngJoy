const { Router } = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const learningPhaseRoutes = require('./learningPhase.routes');
const userProgressRoutes = require('./userProgress.routes');
const dictionaryRoutes = require('./dictionary.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/phases', learningPhaseRoutes);
router.use('/progress', userProgressRoutes);
router.use('/dictionary', dictionaryRoutes);

module.exports = router;

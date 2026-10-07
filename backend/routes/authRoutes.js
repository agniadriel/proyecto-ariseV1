// routes/authRoutes.js
const { Router } = require('express');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, me);

module.exports = router;

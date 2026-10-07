// routes/dashboardRoutes.js
const { Router } = require('express');
const { getDashboard } = require('../controllers/dashboardController');

const { requireAuth } = require('../middleware/auth');

const router = Router();


router.use(requireAuth);
router.get('/', getDashboard); // /api/dashboard?month=&year=

module.exports = router;
// routes/entryRoutes.js
const { Router } = require('express');
const {
  upsertEntry,
  listMonthEntries,
  listDayEntries,
  listTodayEntries,
} = require('../controllers/entryController');

const { requireAuth } = require('../middleware/auth');

const router = Router();


router.use(requireAuth);
router.post('/', upsertEntry);
router.get('/today', listTodayEntries);
router.get('/date', listDayEntries);
router.get('/', listMonthEntries);

module.exports = router;
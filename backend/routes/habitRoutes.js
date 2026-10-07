// routes/habitRoutes.js
const { Router } = require('express');
const {
  createHabit,
  listHabits,
  updateHabit,
  listAllHabits,
  deleteHabit,
} = require('../controllers/habitController');

const { requireAuth } = require('../middleware/auth');

const router = Router();


router.use(requireAuth);
router.post('/', createHabit);
router.get('/', listHabits);
router.get('/all', listAllHabits);
router.patch('/:id', updateHabit);
router.delete('/:id', deleteHabit);

module.exports = router;
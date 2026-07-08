const express = require('express');
const router = express.Router();
const { getStandings, updateStanding } = require('../controllers/standingController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getStandings);
router.put('/:id', protect, authorize('admin', 'editor'), updateStanding);

module.exports = router;

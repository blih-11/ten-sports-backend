const express = require('express');
const router = express.Router();
const { getStandings, updateStanding, createStanding, deleteStanding, generateStandings } = require('../controllers/standingController');
const { protect, authorize } = require('../middleware/auth');
const cachePublic = require('../middleware/cachePublic');

// Shorter TTL than teams/leagues/categories -- standings get refreshed by
// the live-fixtures sync job every couple of minutes during match hours,
// so we don't want visitors seeing a full minute-old table.
router.get('/', cachePublic(20), getStandings);
router.post('/generate', protect, authorize('admin', 'editor'), generateStandings);
router.post('/', protect, authorize('admin', 'editor'), createStanding);
router.put('/:id', protect, authorize('admin', 'editor'), updateStanding);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteStanding);

module.exports = router;

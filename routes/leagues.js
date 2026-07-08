const express = require('express');
const router = express.Router();
const { getLeagues, getLeague, createLeague, updateLeague, deleteLeague, syncLeague } = require('../controllers/leagueController');
const { getRoster, getRosterSeasons, addToRoster, removeFromRoster } = require('../controllers/leagueRosterController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getLeagues);
router.get('/:slug', getLeague);
router.post('/', protect, authorize('admin', 'editor'), createLeague);
router.put('/:id', protect, authorize('admin', 'editor'), updateLeague);
router.delete('/:id', protect, authorize('admin'), deleteLeague);
router.post('/:id/sync', protect, authorize('admin'), syncLeague);

// Season-scoped roster
router.get('/:id/roster', getRoster);
router.get('/:id/roster-seasons', getRosterSeasons);
router.post('/:id/roster', protect, authorize('admin', 'editor'), addToRoster);
router.delete('/:id/roster/:teamId', protect, authorize('admin', 'editor'), removeFromRoster);

module.exports = router;
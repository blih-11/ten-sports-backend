const express = require('express');
const router = express.Router();
const { getLeagues, getLeague, createLeague, updateLeague, deleteLeague, syncLeague } = require('../controllers/leagueController');
const { getRoster, getRosterSeasons, addToRoster, removeFromRoster } = require('../controllers/leagueRosterController');
const { protect, authorize } = require('../middleware/auth');
const cachePublic = require('../middleware/cachePublic');

router.get('/', cachePublic(60), getLeagues);
router.get('/:slug', cachePublic(60), getLeague);
router.post('/', protect, authorize('admin', 'editor'), createLeague);
router.put('/:id', protect, authorize('admin', 'editor'), updateLeague);
router.delete('/:id', protect, authorize('admin'), deleteLeague);
router.post('/:id/sync', protect, authorize('admin'), syncLeague);

// Season-scoped roster -- left uncached since admins add/remove teams here
// often and expect the change to show up immediately, both in their own
// view and on the public site.
router.get('/:id/roster', getRoster);
router.get('/:id/roster-seasons', getRosterSeasons);
router.post('/:id/roster', protect, authorize('admin', 'editor'), addToRoster);
router.delete('/:id/roster/:teamId', protect, authorize('admin', 'editor'), removeFromRoster);

module.exports = router;
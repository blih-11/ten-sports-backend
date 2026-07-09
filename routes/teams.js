const express = require('express');
const router = express.Router();
const { getTeams, getTeam, createTeam, updateTeam, deleteTeam } = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');
const cachePublic = require('../middleware/cachePublic');

router.get('/', cachePublic(60), getTeams);
router.get('/:slug', cachePublic(60), getTeam);
router.post('/', protect, authorize('admin', 'editor'), createTeam);
router.put('/:id', protect, authorize('admin', 'editor'), updateTeam);
router.delete('/:id', protect, authorize('admin'), deleteTeam);

module.exports = router;

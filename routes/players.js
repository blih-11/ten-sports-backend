const express = require('express');
const router = express.Router();
const { getPlayers, getPlayer, createPlayer, updatePlayer, deletePlayer } = require('../controllers/playerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getPlayers);
router.get('/:slug', getPlayer);
router.post('/', protect, authorize('admin', 'editor'), createPlayer);
router.put('/:id', protect, authorize('admin', 'editor'), updatePlayer);
router.delete('/:id', protect, authorize('admin'), deletePlayer);

module.exports = router;

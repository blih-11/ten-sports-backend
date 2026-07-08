const express = require('express');
const router = express.Router();
const { getFixtures, getFixture, getTodaysFixtures, createFixture, updateFixture } = require('../controllers/fixtureController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getFixtures);
router.get('/today', getTodaysFixtures);
router.get('/:id', getFixture);
router.post('/', protect, authorize('admin', 'editor'), createFixture);
router.put('/:id', protect, authorize('admin', 'editor'), updateFixture);

module.exports = router;

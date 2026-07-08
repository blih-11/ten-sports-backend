const express = require('express');
const router = express.Router();
const { resetSportsData } = require('../controllers/dataResetController');
const { protect, authorize } = require('../middleware/auth');

// Admin-only -- this deletes data. No editor/writer access.
router.post('/reset', protect, authorize('admin'), resetSportsData);

module.exports = router;

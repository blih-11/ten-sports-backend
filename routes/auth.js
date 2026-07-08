const express = require('express');
const router = express.Router();
const { register, login, getMe, getTeam, updateRole, deactivateUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/register', protect, authorize('admin'), register);
router.get('/team', protect, authorize('admin'), getTeam);
router.put('/team/:id', protect, authorize('admin'), updateRole);
router.delete('/team/:id', protect, authorize('admin'), deactivateUser);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getNavItems, getAdminNavItems, createNavItem, updateNavItem, deleteNavItem, reorderNavItems,
} = require('../controllers/navItemController');
const { protect, authorize } = require('../middleware/auth');

// Public — the live site fetches this to render the nav
router.get('/', getNavItems);

// Admin management
router.get('/admin/all', protect, getAdminNavItems);
router.put('/reorder', protect, authorize('admin', 'editor'), reorderNavItems);
router.post('/', protect, authorize('admin', 'editor'), createNavItem);
router.put('/:id', protect, authorize('admin', 'editor'), updateNavItem);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteNavItem);

module.exports = router;

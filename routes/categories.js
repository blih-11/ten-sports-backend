const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const cachePublic = require('../middleware/cachePublic');

router.get('/', cachePublic(60), getCategories);
router.post('/', protect, authorize('admin', 'editor', 'writer'), createCategory);
router.put('/:id', protect, authorize('admin', 'editor', 'writer'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;

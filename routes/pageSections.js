const express = require('express');
const router = express.Router();
const {
  getPageSections, getAdminPageSections, getPagesList,
  upsertPageSection, bulkUpsertPageSections, deletePageSection,
} = require('../controllers/pageSectionController');
const { protect, authorize } = require('../middleware/auth');

// Admin-only routes (more specific paths registered first)
router.get('/admin/meta/pages', protect, authorize('admin', 'editor'), getPagesList);
router.get('/admin/:page', protect, authorize('admin', 'editor'), getAdminPageSections);

// Public: fetch a page's content as a flat { sectionKey: content } map
router.get('/:page', getPageSections);

// Admin-only writes
router.put('/:page/:sectionKey', protect, authorize('admin', 'editor'), upsertPageSection);
router.post('/:page/bulk', protect, authorize('admin', 'editor'), bulkUpsertPageSections);
router.delete('/:page/:sectionKey', protect, authorize('admin', 'editor'), deletePageSection);

module.exports = router;

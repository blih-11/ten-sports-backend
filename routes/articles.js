const express = require('express');
const router = express.Router();
const {
  getArticles, getArticle, getAdminArticles, createArticle, updateArticle, deleteArticle, getRelated,
  getHomeFeed, getTeamFeed, getCompetitionFeed, getAdminHomeLayout, setHomePosition, getArticleStats,
} = require('../controllers/articleController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
// NOTE: feed routes are registered BEFORE the generic '/:slug' route so
// e.g. '/feed/home' isn't swallowed by the ':slug' param matcher.
router.get('/', getArticles);
router.get('/feed/home', getHomeFeed);
router.get('/feed/team/:slug', getTeamFeed);
router.get('/feed/competition/:slug', getCompetitionFeed);
router.get('/:slug', getArticle);
router.get('/:id/related', getRelated);

// Protected routes
router.get('/admin/all', protect, getAdminArticles);
router.get('/admin/stats', protect, getArticleStats);
router.get('/admin/home-layout', protect, getAdminHomeLayout);
router.put('/:id/home-position', protect, authorize('admin', 'editor'), setHomePosition);
router.post('/', protect, authorize('admin', 'editor', 'writer'), createArticle);
router.put('/:id', protect, authorize('admin', 'editor', 'writer'), updateArticle);
router.delete('/:id', protect, authorize('admin', 'editor'), deleteArticle);

module.exports = router;

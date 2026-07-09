const express = require('express');
const router = express.Router();
const { getLogoAliases, upsertLogoAlias, deleteLogoAlias } = require('../controllers/logoAliasController');
const { protect, authorize } = require('../middleware/auth');

// Public read -- both the admin picker and the live frontend need this to
// resolve display names / merge aliases over the bundled logo library.
router.get('/', getLogoAliases);

router.put('/:kind/:slug', protect, authorize('admin', 'editor', 'writer'), upsertLogoAlias);
router.delete('/:kind/:slug', protect, authorize('admin', 'editor', 'writer'), deleteLogoAlias);

module.exports = router;

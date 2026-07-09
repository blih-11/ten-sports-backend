const LogoAlias = require('../models/LogoAlias');

// GET /api/logo-aliases?kind=team
// Returns every override on record so the admin (and frontend) can merge
// them over the bundled static library.
exports.getLogoAliases = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.kind) query.kind = req.query.kind;
    const items = await LogoAlias.find(query).sort('slug');
    res.json({ success: true, count: items.length, data: items });
  } catch (error) { next(error); }
};

// PUT /api/logo-aliases/:kind/:slug
// Upserts the display name / aliases for one bundled logo entry.
exports.upsertLogoAlias = async (req, res, next) => {
  try {
    const { kind, slug } = req.params;
    if (!['team', 'competition'].includes(kind)) {
      return res.status(400).json({ success: false, message: 'kind must be "team" or "competition"' });
    }
    const { displayName, aliases } = req.body;
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ success: false, message: 'displayName is required' });
    }
    const cleanAliases = Array.isArray(aliases)
      ? [...new Set(aliases.map(a => String(a).trim().toLowerCase()).filter(Boolean))]
      : [];

    const item = await LogoAlias.findOneAndUpdate(
      { kind, slug },
      { kind, slug, displayName: displayName.trim(), aliases: cleanAliases },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

// DELETE /api/logo-aliases/:kind/:slug
// Resets a single entry back to its default (slug-derived) name.
exports.deleteLogoAlias = async (req, res, next) => {
  try {
    const { kind, slug } = req.params;
    await LogoAlias.findOneAndDelete({ kind, slug });
    res.json({ success: true, message: 'Reset to default name' });
  } catch (error) { next(error); }
};

const NavItem = require('../models/NavItem');

// @desc    Get the live nav structure (public, active items only)
// @route   GET /api/nav-items
exports.getNavItems = async (req, res, next) => {
  try {
    const items = await NavItem.find({ isActive: true }).sort({ order: 1 });
    const data = items.map(i => ({
      label: i.label,
      slug: i.slug,
      subnav: [...i.subnav].sort((a, b) => a.order - b.order),
    }));
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// @desc    Get all nav items, including inactive (admin management)
// @route   GET /api/nav-items/admin/all
exports.getAdminNavItems = async (req, res, next) => {
  try {
    const items = await NavItem.find().sort({ order: 1 });
    res.json({ success: true, data: items });
  } catch (error) { next(error); }
};

// @desc    Create a nav item (sport)
// @route   POST /api/nav-items
exports.createNavItem = async (req, res, next) => {
  try {
    const count = await NavItem.countDocuments();
    const item = await NavItem.create({ ...req.body, order: req.body.order ?? count });
    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
};

// @desc    Update a nav item (label, slug, active, subnav array)
// @route   PUT /api/nav-items/:id
exports.updateNavItem = async (req, res, next) => {
  try {
    const item = await NavItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Nav item not found' });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
};

// @desc    Delete a nav item
// @route   DELETE /api/nav-items/:id
exports.deleteNavItem = async (req, res, next) => {
  try {
    const item = await NavItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Nav item not found' });
    await item.deleteOne();
    res.json({ success: true, message: 'Nav item deleted' });
  } catch (error) { next(error); }
};

// @desc    Reorder nav items in one call
// @route   PUT /api/nav-items/reorder
// @body    { order: [navItemId, navItemId, ...] } — array in the new display order
exports.reorderNavItems = async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ success: false, message: '"order" must be an array of nav item ids' });
    await Promise.all(order.map((id, index) => NavItem.findByIdAndUpdate(id, { order: index })));
    const items = await NavItem.find().sort({ order: 1 });
    res.json({ success: true, data: items });
  } catch (error) { next(error); }
};

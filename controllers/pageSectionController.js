const PageSection = require('../models/PageSection');

// Turns an array of PageSection docs into a flat { sectionKey: content } map,
// which is the shape the frontend actually wants to consume (it doesn't care
// about label/group/type/order -- that's admin-only metadata).
function toContentMap(sections) {
  return sections.reduce((acc, s) => {
    acc[s.sectionKey] = s.content;
    return acc;
  }, {});
}

// @desc    Get all sections for a page, as a flat content map (public)
// @route   GET /api/page-sections/:page
exports.getPageSections = async (req, res, next) => {
  try {
    const sections = await PageSection.find({ page: req.params.page.toLowerCase() }).sort({ order: 1 });
    res.json({ success: true, data: toContentMap(sections) });
  } catch (error) { next(error); }
};

// @desc    Get all sections for a page, full documents incl. admin metadata
// @route   GET /api/page-sections/admin/:page
exports.getAdminPageSections = async (req, res, next) => {
  try {
    const sections = await PageSection.find({ page: req.params.page.toLowerCase() }).sort({ group: 1, order: 1 });
    res.json({ success: true, count: sections.length, data: sections });
  } catch (error) { next(error); }
};

// @desc    List every page that currently has sections (drives the admin's page list)
// @route   GET /api/page-sections/admin/meta/pages
exports.getPagesList = async (req, res, next) => {
  try {
    const pages = await PageSection.distinct('page');
    res.json({ success: true, data: pages });
  } catch (error) { next(error); }
};

// @desc    Create or update one section (upsert by page + sectionKey)
// @route   PUT /api/page-sections/:page/:sectionKey
exports.upsertPageSection = async (req, res, next) => {
  try {
    const page = req.params.page.toLowerCase();
    const { sectionKey } = req.params;
    const { label, group, type, content, order } = req.body;

    const update = { content, updatedBy: req.user._id };
    if (label !== undefined) update.label = label;
    if (group !== undefined) update.group = group;
    if (type !== undefined) update.type = type;
    if (order !== undefined) update.order = order;

    const section = await PageSection.findOneAndUpdate(
      { page, sectionKey },
      { $set: update, $setOnInsert: { page, sectionKey, label: label || sectionKey } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: section });
  } catch (error) { next(error); }
};

// @desc    Bulk upsert -- seed/replace every section for a page in one call
// @route   POST /api/page-sections/:page/bulk
// body: { sections: [{ sectionKey, label, group, type, content, order }, ...] }
exports.bulkUpsertPageSections = async (req, res, next) => {
  try {
    const page = req.params.page.toLowerCase();
    const { sections } = req.body;
    if (!Array.isArray(sections)) {
      return res.status(400).json({ success: false, message: '"sections" must be an array' });
    }

    const ops = sections.map(s => ({
      updateOne: {
        filter: { page, sectionKey: s.sectionKey },
        update: {
          $set: { content: s.content, label: s.label, group: s.group, type: s.type, order: s.order, updatedBy: req.user._id },
          $setOnInsert: { page, sectionKey: s.sectionKey },
        },
        upsert: true,
      },
    }));
    if (ops.length) await PageSection.bulkWrite(ops);

    const result = await PageSection.find({ page }).sort({ group: 1, order: 1 });
    res.json({ success: true, count: result.length, data: result });
  } catch (error) { next(error); }
};

// @desc    Delete a section
// @route   DELETE /api/page-sections/:page/:sectionKey
exports.deletePageSection = async (req, res, next) => {
  try {
    const page = req.params.page.toLowerCase();
    const section = await PageSection.findOneAndDelete({ page, sectionKey: req.params.sectionKey });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, message: 'Section deleted' });
  } catch (error) { next(error); }
};

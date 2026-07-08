const mongoose = require('mongoose');

// A sub-nav entry under a sport (News, Results & Fixtures, Transfers, Teams,
// Competitions, Table, Standings...). `tab` is a fixed key the frontend
// already knows how to render (it maps to a real tab component) -- editors
// can rename the label and reorder these, but can't invent a brand new tab
// type from the admin since there's no matching UI for one that doesn't
// exist yet.
const subNavItemSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  tab: {
    type: String,
    required: true,
    enum: ['news', 'results', 'transfers', 'teams', 'competitions', 'table', 'standings'],
  },
  order: { type: Number, default: 0 },
}, { _id: false });

const navItemSchema = new mongoose.Schema({
  label:    { type: String, required: true, trim: true },   // e.g. "Football"
  slug:     { type: String, required: true, unique: true, lowercase: true, trim: true }, // e.g. "football" -> /football
  order:    { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }, // toggled off = hidden from the live nav without deleting it
  subnav:   [subNavItemSchema],
}, { timestamps: true });

navItemSchema.index({ order: 1 });

module.exports = mongoose.model('NavItem', navItemSchema);

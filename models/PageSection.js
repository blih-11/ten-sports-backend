const mongoose = require('mongoose');

// Generic, page-agnostic "content block" so any page in the admin can be
// listed section-by-section and edited without a new backend model/route
// every time a new editable field is needed.
//
// Example rows for the Home page:
//   { page: 'home', sectionKey: 'hero_banner_heading',    type: 'text',  content: 'Latest Sports News' }
//   { page: 'home', sectionKey: 'hero_banner_subheading', type: 'text',  content: 'Stay ahead of the game' }
//   { page: 'home', sectionKey: 'promo_banner_image',     type: 'image', content: { url: '...', alt: '...' } }
//
// `page` groups sections in the admin sidebar (Home / Sports / Results &
// Fixtures / Transfers / ...). `sectionKey` is the stable field name the
// frontend fetches by. Together they're unique.

const pageSectionSchema = new mongoose.Schema({
  page:       { type: String, required: true, trim: true, lowercase: true }, // e.g. 'home', 'sports', 'results-fixtures', 'transfers'
  sectionKey: { type: String, required: true, trim: true },                  // e.g. 'hero_heading'
  label:      { type: String, required: true, trim: true },                  // human-readable name shown in the admin UI
  group:      { type: String, default: 'General', trim: true },              // sub-heading to cluster related fields in the admin UI, e.g. 'Hero', 'SEO'
  type:       { type: String, enum: ['text', 'richtext', 'image', 'logo', 'link', 'boolean', 'json'], default: 'text' },
  content:    { type: mongoose.Schema.Types.Mixed, default: '' },
  order:      { type: Number, default: 0 },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

pageSectionSchema.index({ page: 1, sectionKey: 1 }, { unique: true });
pageSectionSchema.index({ page: 1, order: 1 });

module.exports = mongoose.model('PageSection', pageSectionSchema);

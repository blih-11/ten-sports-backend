const mongoose = require('mongoose');
const slugify = require('slugify');

const articleSchema = new mongoose.Schema({
  title:    { type: String, required: [true, 'Title is required'], trim: true },
  slug:     { type: String, unique: true },
  subheading: { type: String, default: '', trim: true, maxlength: 300 }, // sub-heading shown under the title
  excerpt:  { type: String, required: [true, 'Excerpt is required'], maxlength: 300 },
  content:  { type: String, required: [true, 'Content is required'] },
  featuredImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  tags: [{ type: String, lowercase: true }],
  source: { type: String, default: '', trim: true }, // byline, e.g. 'Admin', 'Reuters'

  // ── News routing ──────────────────────────────────────────────────────────
  // An article can belong to multiple teams and/or multiple competitions.
  // These drive: team news pages, competition news pages, and "top stories".
  teams:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  competitions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'League' }],

  // Only ONE article site-wide should have isHero: true at any time.
  // Enforced in the controller (not a DB constraint) so we can atomically
  // demote the previous hero in the same request.
  isHero: { type: Boolean, default: false },

  // Manual pin into one of the 3 homepage "side news" slots (1, 2, or 3).
  // null = not pinned. Enforced as exclusive per-slot in the controller,
  // same pattern as isHero. If fewer than 3 slots are pinned, the home
  // feed backfills the empty ones with the most recent published articles
  // so the layout never shows gaps.
  sideNewsOrder: { type: Number, default: null, min: 1, max: 3 },

  // Manual pin for a team/competition's "Top Stories" rail. Optional — if an
  // entity has fewer than 6 pinned stories, the top-stories query backfills
  // with the most recent articles for that entity. This lets editors force
  // a story to stick without having to fight recency sorting.
  isTopStory: { type: Boolean, default: false },

  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:   { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  isFeatured: { type: Boolean, default: false },
  isBreaking: { type: Boolean, default: false },
  views:    { type: Number, default: 0 },
  publishedAt: { type: Date, default: null },
  scheduledAt: { type: Date, default: null },
  seo: {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: [{ type: String }],
  },
  embeddedVideo: { type: String, default: '' }, // YouTube embed URL
}, { timestamps: true });

// Auto generate slug from title
articleSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Increment views
articleSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

// Helpful indexes for the news-routing queries (hero/side/latest/top-stories)
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, teams: 1, publishedAt: -1 });
articleSchema.index({ status: 1, competitions: 1, publishedAt: -1 });
articleSchema.index({ status: 1, isHero: 1 });
articleSchema.index({ status: 1, sideNewsOrder: 1 });
articleSchema.index({ status: 1, isTopStory: 1 });

module.exports = mongoose.model('Article', articleSchema);

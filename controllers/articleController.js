const Article = require('../models/Article');
const Team = require('../models/Team');
const League = require('../models/League');
const Category = require('../models/Category');
const cloudinary = require('../config/cloudinary');

const ARTICLE_POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'author', select: 'name avatar' },
  { path: 'teams', select: 'name slug logo' },
  { path: 'competitions', select: 'name slug logo' },
];

// @desc    Get all published articles (public)
// @route   GET /api/articles
exports.getArticles = async (req, res, next) => {
  try {
    const { category, tag, search, limit = 10, page = 1, featured, breaking } = req.query;
    const query = { status: 'published' };

    if (category) query.category = category;
    if (tag) query.tags = { $in: [tag.toLowerCase()] };
    if (featured) query.isFeatured = true;
    if (breaking) query.isBreaking = true;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Article.countDocuments(query);
    const articles = await Article.find(query)
      .populate(ARTICLE_POPULATE)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: articles.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: articles,
    });
  } catch (error) { next(error); }
};

// @desc    Get single article by slug (public)
// @route   GET /api/articles/:slug
exports.getArticle = async (req, res, next) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, status: 'published' })
      .populate(ARTICLE_POPULATE);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    await article.incrementViews();
    res.json({ success: true, data: article });
  } catch (error) { next(error); }
};

// @desc    Get all articles for admin (all statuses)
// @route   GET /api/articles/admin/all
exports.getAdminArticles = async (req, res, next) => {
  try {
    const { status, category, sport, team, competition, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (team) query.teams = team;
    if (competition) query.competitions = competition;
    if (search) query.title = { $regex: search, $options: 'i' };
    // Writers can only see their own articles
    if (req.user.role === 'writer') query.author = req.user._id;

    // Filter to articles tagged with any team/competition belonging to a
    // given sport (used by the admin's per-sport News/Transfers screens).
    if (sport) {
      const [teamIds, leagueIds] = await Promise.all([
        Team.find({ sport }).distinct('_id'),
        League.find({ sport }).distinct('_id'),
      ]);
      query.$or = [{ teams: { $in: teamIds } }, { competitions: { $in: leagueIds } }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Article.countDocuments(query);
    const articles = await Article.find(query)
      .populate([
        { path: 'category', select: 'name' },
        { path: 'author', select: 'name' },
        { path: 'teams', select: 'name slug' },
        { path: 'competitions', select: 'name slug' },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, count: articles.length, total, pages: Math.ceil(total / parseInt(limit)), data: articles });
  } catch (error) { next(error); }
};

// @desc    Dashboard stats — counts by status, total views, and most-read
// @route   GET /api/articles/admin/stats
exports.getArticleStats = async (req, res, next) => {
  try {
    const query = {};
    // Writers only see stats for their own articles, same scoping as admin/all
    if (req.user.role === 'writer') query.author = req.user._id;

    const [total, published, draft, viewsAgg, mostRead] = await Promise.all([
      Article.countDocuments(query),
      Article.countDocuments({ ...query, status: 'published' }),
      Article.countDocuments({ ...query, status: 'draft' }),
      Article.aggregate([{ $match: query }, { $group: { _id: null, totalViews: { $sum: '$views' } } }]),
      Article.find({ ...query, status: 'published' })
        .sort({ views: -1 })
        .limit(5)
        .select('title views category')
        .populate('category', 'name'),
    ]);

    res.json({
      success: true,
      data: {
        total, published, draft,
        totalViews: viewsAgg[0]?.totalViews || 0,
        mostRead,
      },
    });
  } catch (error) { next(error); }
};

// @desc    Create article
// @route   POST /api/articles
exports.createArticle = async (req, res, next) => {
  try {
    req.body.author = req.user._id;

    // Only one article site-wide may be the hero. If this one is flagged as
    // hero, demote whichever article currently holds that spot -- it simply
    // becomes a normal published article again and falls back into the
    // recency-sorted side-news / latest-news queries automatically.
    if (req.body.isHero) {
      await Article.updateMany({ isHero: true }, { $set: { isHero: false } });
    }

    const article = await Article.create(req.body);
    const populated = await article.populate(ARTICLE_POPULATE);
    res.status(201).json({ success: true, data: populated });
  } catch (error) { next(error); }
};

// @desc    Update article
// @route   PUT /api/articles/:id
exports.updateArticle = async (req, res, next) => {
  try {
    let article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    // Writers can only edit their own
    if (req.user.role === 'writer' && article.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this article' });
    }

    if (req.body.isHero) {
      await Article.updateMany({ _id: { $ne: article._id }, isHero: true }, { $set: { isHero: false } });
    }

    article = await Article.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate(ARTICLE_POPULATE);
    res.json({ success: true, data: article });
  } catch (error) { next(error); }
};

// @desc    Delete article
// @route   DELETE /api/articles/:id
exports.deleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    // Delete image(s) from cloudinary
    if (article.featuredImage.publicId) {
      await cloudinary.uploader.destroy(article.featuredImage.publicId);
    }
    if (article.featuredImage.thumbnailPublicId) {
      await cloudinary.uploader.destroy(article.featuredImage.thumbnailPublicId);
    }
    if (article.socialImage?.publicId) {
      await cloudinary.uploader.destroy(article.socialImage.publicId);
    }
    await article.deleteOne();
    res.json({ success: true, message: 'Article deleted' });
  } catch (error) { next(error); }
};

// @desc    Get related articles
// @route   GET /api/articles/:id/related
exports.getRelated = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
    const related = await Article.find({
      _id: { $ne: article._id },
      category: article.category,
      status: 'published',
    }).limit(4).populate('category', 'name slug').populate('author', 'name');
    res.json({ success: true, data: related });
  } catch (error) { next(error); }
};

// -----------------------------------------------------------------------
// News routing / layout feeds
//
// Nothing here physically "moves" an article between buckets. Hero, side
// news, latest news, and the per-category "Top Stories" tabs are all just
// different windows over the same recency-sorted, published-articles
// query, each excluding whatever the windows before it already claimed:
//
//   Hero (1) -> Side news (4) -> Latest news (6) -> Top Stories (6/tab)
//
// A new article entering at Hero automatically cascades everything below
// it down by one, and nothing can ever appear in two windows at once.
// Once an article ages out of Top Stories it's simply no longer in any
// home-page window — it still lives on its category/team/competition page
// via the normal paginated queries below, which don't exclude anything.
//
// Manual pins (isHero / sideNewsOrder / isTopStory) are an override layer
// on top of this, not a replacement for it: a pin always wins its slot,
// and anything left unpinned is filled in by recency as above.
// -----------------------------------------------------------------------

const SIDE_NEWS_COUNT = 4;
const LATEST_NEWS_HOME_COUNT = 6;
const TOP_STORIES_HOME_COUNT = 6;
const TOP_STORIES_TABS = 5; // how many top-level categories get a Top Stories tab
const TOP_STORIES_COUNT = 6;

// @desc    Home page news layout: hero, side news, latest news, and
//          per-category Top Stories tabs — one continuous rotation, no
//          article can appear in more than one section.
// @route   GET /api/articles/feed/home
exports.getHomeFeed = async (req, res, next) => {
  try {
    const { limit = LATEST_NEWS_HOME_COUNT, page = 1 } = req.query;

    // Hero: whichever article is manually flagged, falling back to the most
    // recent published article if none is flagged yet.
    let hero = await Article.findOne({ status: 'published', isHero: true })
      .sort({ publishedAt: -1 })
      .populate(ARTICLE_POPULATE);
    if (!hero) {
      hero = await Article.findOne({ status: 'published' })
        .sort({ publishedAt: -1 })
        .populate(ARTICLE_POPULATE);
    }

    const excludeIds = hero ? [hero._id] : [];

    // Side news: manually pinned slots (1-4) first, in slot order. If an
    // editor hasn't filled all 4 slots, backfill the rest with the most
    // recent published articles so the layout never shows a gap.
    const pinnedSide = await Article.find({ status: 'published', sideNewsOrder: { $in: [1, 2, 3, 4] }, _id: { $nin: excludeIds } })
      .sort({ sideNewsOrder: 1 })
      .populate(ARTICLE_POPULATE);

    let sideNews = pinnedSide;
    if (sideNews.length < SIDE_NEWS_COUNT) {
      const fillIds = [...excludeIds, ...sideNews.map(a => a._id)];
      const backfill = await Article.find({ status: 'published', _id: { $nin: fillIds } })
        .sort({ publishedAt: -1 })
        .limit(SIDE_NEWS_COUNT - sideNews.length)
        .populate(ARTICLE_POPULATE);
      sideNews = [...sideNews, ...backfill];
    }

    excludeIds.push(...sideNews.map(a => a._id));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const latestQuery = { status: 'published', _id: { $nin: excludeIds } };
    const totalLatest = await Article.countDocuments(latestQuery);
    const latestNews = await Article.find(latestQuery)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate(ARTICLE_POPULATE);

    // Only the first page of latest news actually claims articles out of
    // the rotation — later pages ("load more") are just deeper into the
    // same already-excluded pool, so Top Stories shouldn't also exclude
    // articles that are merely on page 2+ of latest news.
    if (parseInt(page) === 1) excludeIds.push(...latestNews.map(a => a._id));

    // Top Stories: one tab per top-level category, pulling whatever's next
    // in that category's recency order that hasn't already been claimed
    // above. Since an article only ever has one category, a story can
    // never show up under two different tabs either.
    const topCategories = await Category.find({ parent: null })
      .sort({ order: 1, name: 1 })
      .limit(TOP_STORIES_TABS);

    const topStoriesByCategory = [];
    for (const cat of topCategories) {
      const catQuery = { status: 'published', category: cat._id, _id: { $nin: excludeIds } };

      const pinned = await Article.find({ ...catQuery, isTopStory: true })
        .sort({ publishedAt: -1 })
        .limit(TOP_STORIES_HOME_COUNT)
        .populate(ARTICLE_POPULATE);

      let articles = pinned;
      if (articles.length < TOP_STORIES_HOME_COUNT) {
        const fillIds = [...excludeIds, ...articles.map(a => a._id)];
        const backfill = await Article.find({ status: 'published', category: cat._id, _id: { $nin: fillIds } })
          .sort({ publishedAt: -1 })
          .limit(TOP_STORIES_HOME_COUNT - articles.length)
          .populate(ARTICLE_POPULATE);
        articles = [...articles, ...backfill];
      }

      excludeIds.push(...articles.map(a => a._id));
      topStoriesByCategory.push({ category: { _id: cat._id, name: cat.name, slug: cat.slug }, articles });
    }

    res.json({
      success: true,
      data: {
        hero,
        sideNews,
        latestNews,
        latestNewsPagination: {
          total: totalLatest,
          pages: Math.ceil(totalLatest / parseInt(limit)),
          currentPage: parseInt(page),
        },
        topStoriesByCategory,
      },
    });
  } catch (error) { next(error); }
};

// @desc    Admin view of the home layout — same shape as getHomeFeed, but
//          also usable for management (shows which article holds which
//          slot so the admin UI can offer "change"/"remove" actions).
// @route   GET /api/articles/admin/home-layout
exports.getAdminHomeLayout = async (req, res, next) => {
  try {
    const hero = await Article.findOne({ isHero: true }).populate(ARTICLE_POPULATE);

    const sideSlots = await Article.find({ sideNewsOrder: { $in: [1, 2, 3, 4] } })
      .sort({ sideNewsOrder: 1 })
      .populate(ARTICLE_POPULATE);

    // Shape as a fixed 4-length array (null where a slot is empty) so the
    // admin UI can render "Slot 1 / 2 / 3 / 4" predictably.
    const sideNews = [1, 2, 3, 4].map(slot => sideSlots.find(a => a.sideNewsOrder === slot) || null);

    const { page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const excludeIds = [hero?._id, ...sideSlots.map(a => a._id)].filter(Boolean);
    const latestQuery = { status: 'published', _id: { $nin: excludeIds } };
    const total = await Article.countDocuments(latestQuery);
    const latestNews = await Article.find(latestQuery)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate(ARTICLE_POPULATE);

    res.json({
      success: true,
      data: {
        hero,
        sideNews,
        latestNews,
        latestNewsPagination: { total, pages: Math.ceil(total / parseInt(limit)), currentPage: parseInt(page) },
      },
    });
  } catch (error) { next(error); }
};

// @desc    Assign/remove an article's homepage position (hero / one of the
//          4 side-news slots / none). Handles exclusivity: setting an
//          article as hero demotes whichever article held it before;
//          assigning a side slot bumps out whichever article held that
//          slot before. An article can only hold one position at a time.
// @route   PUT /api/articles/:id/home-position
// @body    { position: 'hero' | 'side' | 'none', slot?: 1 | 2 | 3 | 4 }
exports.setHomePosition = async (req, res, next) => {
  try {
    const { position, slot } = req.body;
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

    if (position === 'hero') {
      await Article.updateMany({ _id: { $ne: article._id }, isHero: true }, { $set: { isHero: false } });
      article.isHero = true;
      article.sideNewsOrder = null;
    } else if (position === 'side') {
      if (![1, 2, 3, 4].includes(slot)) {
        return res.status(400).json({ success: false, message: 'A valid "slot" (1-4) is required for position "side"' });
      }
      await Article.updateMany({ _id: { $ne: article._id }, sideNewsOrder: slot }, { $set: { sideNewsOrder: null } });
      article.isHero = false;
      article.sideNewsOrder = slot;
    } else if (position === 'none') {
      article.isHero = false;
      article.sideNewsOrder = null;
    } else {
      return res.status(400).json({ success: false, message: 'position must be "hero", "side", or "none"' });
    }

    await article.save();
    const populated = await article.populate(ARTICLE_POPULATE);
    res.json({ success: true, data: populated });
  } catch (error) { next(error); }
};

// Shared helper for team / competition feeds
async function buildEntityFeed({ matchField, matchId, limit, page }) {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const listQuery = { status: 'published', [matchField]: matchId };

  const total = await Article.countDocuments(listQuery);
  const latestNews = await Article.find(listQuery)
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate(ARTICLE_POPULATE);

  // Top stories: pinned (isTopStory) articles first, then backfill with the
  // most recent remaining articles for this entity up to TOP_STORIES_COUNT.
  const pinned = await Article.find({ ...listQuery, isTopStory: true })
    .sort({ publishedAt: -1 })
    .limit(TOP_STORIES_COUNT)
    .populate(ARTICLE_POPULATE);

  let topStories = pinned;
  if (topStories.length < TOP_STORIES_COUNT) {
    const fillIds = topStories.map(a => a._id);
    const backfill = await Article.find({ ...listQuery, _id: { $nin: fillIds } })
      .sort({ publishedAt: -1 })
      .limit(TOP_STORIES_COUNT - topStories.length)
      .populate(ARTICLE_POPULATE);
    topStories = [...topStories, ...backfill];
  }

  return {
    topStories,
    latestNews,
    latestNewsPagination: {
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
    },
  };
}

// @desc    Team page news: top stories + paginated latest news for one team
// @route   GET /api/articles/feed/team/:slug
exports.getTeamFeed = async (req, res, next) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const team = await Team.findOne({ slug: req.params.slug });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const feed = await buildEntityFeed({ matchField: 'teams', matchId: team._id, limit, page });
    res.json({ success: true, team: { _id: team._id, name: team.name, slug: team.slug, logo: team.logo }, data: feed });
  } catch (error) { next(error); }
};

// @desc    Competition page news: top stories + paginated latest news
// @route   GET /api/articles/feed/competition/:slug
exports.getCompetitionFeed = async (req, res, next) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const competition = await League.findOne({ slug: req.params.slug });
    if (!competition) return res.status(404).json({ success: false, message: 'Competition not found' });

    const feed = await buildEntityFeed({ matchField: 'competitions', matchId: competition._id, limit, page });
    res.json({ success: true, competition: { _id: competition._id, name: competition.name, slug: competition.slug, logo: competition.logo }, data: feed });
  } catch (error) { next(error); }
};
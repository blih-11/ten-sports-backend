// Adds a Cache-Control header to public, read-only responses so browsers
// and CDNs can reuse the response for `seconds` instead of hitting the
// API (and Mongo) again on every page load. Only apply this to routes
// that are:
//   - public GET endpoints (no auth/session-specific data)
//   - rarely-changing reference data (teams, leagues, categories, standings)
// Do NOT apply to admin routes, auth routes, or anything that should
// reflect an edit immediately (e.g. articles, which change frequently).
const cachePublic = (seconds = 60) => (req, res, next) => {
  res.set('Cache-Control', `public, max-age=${seconds}`);
  next();
};

module.exports = cachePublic;

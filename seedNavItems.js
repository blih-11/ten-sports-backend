// Seeds the NavItem collection so it exactly matches what's currently
// hardcoded in frontend/src/components/layout/Navbar.jsx (the SPORTS array
// and SPORT_SUBNAV map). Safe to re-run — it upserts by slug.
//
// Usage: node seedNavItems.js
require('dotenv').config();
const mongoose = require('mongoose');
const NavItem = require('./models/NavItem');

const NAV_ITEMS = [
  {
    label: 'Football', slug: 'football', order: 0,
    subnav: [
      { label: 'News',               tab: 'news',         order: 0 },
      { label: 'Results & Fixtures', tab: 'results',      order: 1 },
      { label: 'Transfers',          tab: 'transfers',    order: 2 },
      { label: 'Teams',              tab: 'teams',        order: 3 },
      { label: 'Competitions',       tab: 'competitions', order: 4 },
      { label: 'Table',              tab: 'table',        order: 5 },
    ],
  },
  {
    label: 'Tennis', slug: 'tennis', order: 1,
    subnav: [
      { label: 'News', tab: 'news', order: 0 },
    ],
  },
  {
    label: 'Formula 1', slug: 'formula-1', order: 2,
    subnav: [
      { label: 'News', tab: 'news', order: 0 },
    ],
  },
  {
    label: 'NFL', slug: 'nfl', order: 3,
    subnav: [
      { label: 'News', tab: 'news', order: 0 },
    ],
  },
  {
    label: 'NBA', slug: 'nba', order: 4,
    subnav: [
      { label: 'News', tab: 'news', order: 0 },
    ],
  },
  {
    label: 'Rugby', slug: 'rugby', order: 5,
    subnav: [
      { label: 'News', tab: 'news', order: 0 },
    ],
  },
  {
    label: 'Golf', slug: 'golf', order: 6,
    subnav: [
      { label: 'News', tab: 'news', order: 0 },
    ],
  },
  {
    label: 'Boxing', slug: 'boxing', order: 7,
    subnav: [
      { label: 'News', tab: 'news', order: 0 },
    ],
  },
];
// Tennis/F1/NFL/NBA/Rugby/Golf/Boxing are intentionally News-only for now
// (per your July 2026 call to hold off on Results/Standings for these until
// football's pipeline is proven out). Add back 'results'/'standings' entries
// to any of these -- either here + re-run, or directly in Admin -> Navigation
// -- whenever you're ready.

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const item of NAV_ITEMS) {
    await NavItem.findOneAndUpdate(
      { slug: item.slug },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Upserted nav item:', item.label);
  }

  console.log(`Done — ${NAV_ITEMS.length} nav items seeded.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });

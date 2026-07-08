require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

// These must match the `slug` values used in the frontend Navbar's SPORTS
// array (src/components/layout/Navbar.jsx) — that's what CategoryPage looks
// up via useParams().categorySlug. Any sport missing here will 404 when
// clicked from the nav.
const SPORT_CATEGORIES = [
  { name: 'Football',   slug: 'football',   order: 1 },
  { name: 'Tennis',      slug: 'tennis',      order: 2 },
  { name: 'Formula 1',   slug: 'formula-1',   order: 3 },
  { name: 'NFL',         slug: 'nfl',         order: 4 },
  { name: 'NBA',         slug: 'nba',         order: 5 },
  { name: 'Rugby',       slug: 'rugby',       order: 6 },
  { name: 'Golf',        slug: 'golf',        order: 7 },
  { name: 'Boxing',      slug: 'boxing',      order: 8 },
];

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const cat of SPORT_CATEGORIES) {
      const existing = await Category.findOne({ slug: cat.slug });
      if (existing) {
        console.log(`  skipped (exists): ${cat.name}`);
        skipped++;
        continue;
      }
      await Category.create(cat);
      console.log(`  created: ${cat.name}`);
      created++;
    }

    console.log(`\nDone — ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedCategories();
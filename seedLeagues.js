require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');

const LEAGUES = [
  // ── English Football (priority) ───────────────────────────────────────────
  { name: 'Premier League',       slug: 'premier-league',      sport: 'football', country: 'England',  apiId: 39,   season: 2024 },
  { name: 'Championship',         slug: 'championship',        sport: 'football', country: 'England',  apiId: 40,   season: 2024 },
  { name: 'League One',           slug: 'league-one',          sport: 'football', country: 'England',  apiId: 41,   season: 2024 },
  { name: 'League Two',           slug: 'league-two',          sport: 'football', country: 'England',  apiId: 42,   season: 2024 },
  { name: 'FA Cup',               slug: 'fa-cup',              sport: 'football', country: 'England',  apiId: 45,   season: 2024 },
  { name: 'EFL Cup',              slug: 'efl-cup',             sport: 'football', country: 'England',  apiId: 48,   season: 2024 },
  // ── European Football ─────────────────────────────────────────────────────
  { name: 'UEFA Champions League',slug: 'champions-league',    sport: 'football', country: 'Europe',   apiId: 2,    season: 2024 },
  { name: 'UEFA Europa League',   slug: 'europa-league',       sport: 'football', country: 'Europe',   apiId: 3,    season: 2024 },
  { name: 'La Liga',              slug: 'la-liga',             sport: 'football', country: 'Spain',    apiId: 140,  season: 2024 },
  { name: 'Serie A',              slug: 'serie-a',             sport: 'football', country: 'Italy',    apiId: 135,  season: 2024 },
  { name: 'Bundesliga',           slug: 'bundesliga',          sport: 'football', country: 'Germany',  apiId: 78,   season: 2024 },
  { name: 'Ligue 1',             slug: 'ligue-1',             sport: 'football', country: 'France',   apiId: 61,   season: 2024 },
  // ── Basketball ────────────────────────────────────────────────────────────
  { name: 'NBA',                  slug: 'nba',                 sport: 'nba',      country: 'USA',      apiId: 12,   season: 2024 },
  // ── American Football ─────────────────────────────────────────────────────
  { name: 'NFL',                  slug: 'nfl',                 sport: 'nfl',      country: 'USA',      apiId: 1,    season: 2024 },
  // ── Formula 1 ────────────────────────────────────────────────────────────
  { name: 'Formula 1',            slug: 'formula-1',           sport: 'formula-1', country: 'World',   apiId: 1,    season: 2025 },
  // ── Tennis / Rugby / Golf / Boxing — manual entry, no live API sync yet ───
  { name: 'ATP Tour',             slug: 'tennis',              sport: 'tennis',   country: 'World',    isManual: true, season: 2025 },
  { name: 'Rugby Union',          slug: 'rugby',               sport: 'rugby',    country: 'World',    isManual: true, season: 2025 },
  { name: 'Golf',                 slug: 'golf',                sport: 'golf',     country: 'World',    isManual: true, season: 2025 },
  { name: 'Boxing',                slug: 'boxing',              sport: 'boxing',   country: 'World',    isManual: true, season: 2025 },
];

async function seedLeagues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const league of LEAGUES) {
      const existing = await League.findOne({ slug: league.slug });
      if (existing) {
        console.log(`  skipped (exists): ${league.name}`);
        skipped++;
        continue;
      }
      await League.create(league);
      console.log(`  created: ${league.name}`);
      created++;
    }

    console.log(`\nDone — ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedLeagues();

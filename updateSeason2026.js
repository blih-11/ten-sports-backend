// Rolls the football leagues over to the 2026 season (i.e. 2026/27).
// Run this BEFORE seedTeams2026.js — the team seed only syncs the legacy
// team.league pointer when the season it's writing to matches the
// league's *current* season, so leagues need to already say "2026" first.
require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');

async function updateSeason() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await League.updateMany(
    { sport: 'football', season: { $lt: 2026 } },
    { $set: { season: 2026 } }
  );
  console.log(`Updated ${result.modifiedCount} football leagues to season 2026`);

  // NBA/NFL/Formula 1 intentionally untouched — their season-year
  // convention doesn't follow the Aug-Jul football pattern, roll those
  // over separately when their new seasons actually start.

  process.exit(0);
}

updateSeason().catch(err => {
  console.error(err.message);
  process.exit(1);
});

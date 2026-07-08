// One-off cleanup: removes League One / League Two (and anything tied to
// them — teams, fixtures, standings) from the database. Run this once after
// pulling the updated seedLeagues.js so the site stops showing them anywhere.
//
// Usage: node removeLeagues.js
require('dotenv').config();
const mongoose = require('mongoose');

const SLUGS_TO_REMOVE = ['league-one', 'league-two'];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const League = require('./models/League');
  const Team = require('./models/Team');
  const Fixture = require('./models/Fixture');
  const Standing = require('./models/Standing');

  const leagues = await League.find({ slug: { $in: SLUGS_TO_REMOVE } });
  if (leagues.length === 0) {
    console.log('No matching leagues found — nothing to remove.');
    process.exit(0);
  }

  const leagueIds = leagues.map(l => l._id);
  console.log('Removing:', leagues.map(l => l.name).join(', '));

  const teams = await Team.deleteMany({ league: { $in: leagueIds } });
  const fixtures = await Fixture.deleteMany({ league: { $in: leagueIds } });
  const standings = await Standing.deleteMany({ league: { $in: leagueIds } });
  const removedLeagues = await League.deleteMany({ _id: { $in: leagueIds } });

  console.log(`Deleted ${removedLeagues.deletedCount} league(s), ${teams.deletedCount} team(s), ${fixtures.deletedCount} fixture(s), ${standings.deletedCount} standing(s).`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
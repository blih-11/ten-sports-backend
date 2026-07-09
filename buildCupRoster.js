// Builds a season's roster for a domestic CUP competition (FA Cup, EFL Cup)
// by combining the rosters of its feeder league divisions for that season,
// rather than needing a separately hand-confirmed team list.
//
// Why: FA Cup and EFL Cup entrants aren't an independent, hand-researched
// list the way a league's table is — they're simply "every club in these
// divisions". EFL Cup = Premier League + Championship + League One +
// League Two (92 clubs). FA Cup is wider (extends into non-league tiers we
// don't track here), so this gives you the confirmed top-flight-down
// entrants as a solid starting point; add any additional lower-tier
// qualifiers by hand via Admin > Sports > Teams if/when you track them.
//
// Usage:
//   node buildCupRoster.js <cup-slug> <season> <feeder-slug-1> <feeder-slug-2> ...
//
// Examples:
//   node buildCupRoster.js efl-cup 2026 premier-league championship league-one league-two
//   node buildCupRoster.js fa-cup  2026 premier-league championship league-one league-two
//
// Run this AFTER rolling over each feeder league's own roster for the
// season (rolloverSeason.js) and confirming it looks right — this script
// just reads whatever's already on those rosters.

require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');
const LeagueRoster = require('./models/LeagueRoster');

async function run() {
  const cupSlug = process.argv[2];
  const season = parseInt(process.argv[3]);
  const feederSlugs = process.argv.slice(4);

  if (!cupSlug || !season || feederSlugs.length === 0) {
    console.error('Usage: node buildCupRoster.js <cup-slug> <season> <feeder-slug-1> <feeder-slug-2> ...');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const cup = await League.findOne({ slug: cupSlug });
  if (!cup) {
    console.error(`No competition found with slug "${cupSlug}".`);
    process.exit(1);
  }

  const feederLeagues = await League.find({ slug: { $in: feederSlugs } });
  const foundSlugs = feederLeagues.map(l => l.slug);
  const missing = feederSlugs.filter(s => !foundSlugs.includes(s));
  if (missing.length) {
    console.error(`Could not find these feeder league slugs: ${missing.join(', ')} — check Admin > Sports > Competitions.`);
    process.exit(1);
  }

  // Bump the cup's own season field too, so it's consistent with its
  // feeder leagues and shows up correctly in the admin's season picker.
  if (cup.season < season) {
    const old = cup.season;
    cup.season = season;
    await cup.save();
    console.log(`${cup.name}: season bumped ${old} -> ${season}`);
  }

  let totalAdded = 0;
  for (const league of feederLeagues) {
    const entries = await LeagueRoster.find({ league: league._id, season });
    if (!entries.length) {
      console.log(`  ${league.name}: no ${season} roster found yet — skipping (roll that league over first).`);
      continue;
    }
    for (const entry of entries) {
      await LeagueRoster.findOneAndUpdate(
        { league: cup._id, season, team: entry.team },
        { league: cup._id, season, team: entry.team },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`  ${league.name}: added ${entries.length} team(s)`);
    totalAdded += entries.length;
  }

  const distinctCount = await LeagueRoster.countDocuments({ league: cup._id, season });
  console.log(`\nDone — ${cup.name} ${season} roster now has ${distinctCount} team(s) (${totalAdded} write(s) processed, duplicates across feeders collapse automatically).`);
  console.log(`Review in Admin > Sports > Teams ("${cup.name}", season ${season}), then run:`);
  console.log(`  node syncFullSeasonFixtures.js ${cupSlug}`);

  process.exit(0);
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});

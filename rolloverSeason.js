// Generic season rollover for ONE football league at a time.
//
// This replaces the old one-off updateSeason2026.js (which only bulk-bumped
// every football league at once with no roster handling). Use this instead
// so you can roll leagues over individually and review each one before
// moving to the next.
//
// What it does for the given league:
//   1. Sets League.season to the new season year.
//   2. Carries the roster forward: copies every team from the league's most
//      recent existing LeagueRoster season into the new season, so you have
//      a starting point to edit (via Admin > Sports > Teams) rather than
//      starting from a blank roster or needing to hand-confirm every club
//      from scratch. For most leagues, most clubs stay the same season to
//      season — you're only adjusting the handful that got
//      promoted/relegated/transferred.
//   3. Does NOT touch fixtures — run syncFullSeasonFixtures.js separately
//      once the season/roster look right, since that hits the API and you
//      don't want to burn a request on a league you're not ready for yet.
//
// Usage:
//   node rolloverSeason.js <league-slug> <new-season>
//   node rolloverSeason.js premier-league 2026
//   node rolloverSeason.js la-liga 2026
//
// Add --no-carry-roster if you'd rather start the new season with an empty
// roster and add every team by hand:
//   node rolloverSeason.js league-two 2026 --no-carry-roster

require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');
const LeagueRoster = require('./models/LeagueRoster');
const Team = require('./models/Team');

async function run() {
  const slug = process.argv[2];
  const newSeason = parseInt(process.argv[3]);
  const carryRoster = !process.argv.includes('--no-carry-roster');

  if (!slug || !newSeason) {
    console.error('Usage: node rolloverSeason.js <league-slug> <new-season> [--no-carry-roster]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const league = await League.findOne({ slug });
  if (!league) {
    console.error(`No league found with slug "${slug}". Check Admin > Sports > Competitions for the correct slug.`);
    process.exit(1);
  }

  if (league.season >= newSeason) {
    console.log(`${league.name} is already at season ${league.season} (>= ${newSeason}) — nothing to bump.`);
  } else {
    const oldSeason = league.season;
    league.season = newSeason;
    await league.save();
    console.log(`${league.name}: season bumped ${oldSeason} -> ${newSeason}`);
  }

  if (!carryRoster) {
    console.log('Skipping roster carry-forward (--no-carry-roster passed).');
    process.exit(0);
  }

  // Find the most recent season we actually have a roster for, below the
  // new one, and copy it forward as a starting point.
  const priorSeasons = await LeagueRoster.find({ league: league._id, season: { $lt: newSeason } }).distinct('season');
  if (!priorSeasons.length) {
    console.log(`No prior roster found for ${league.name} — nothing to carry forward. Add teams via Admin > Sports > Teams.`);
    process.exit(0);
  }
  const priorSeason = Math.max(...priorSeasons);

  const alreadyHasNewSeason = await LeagueRoster.countDocuments({ league: league._id, season: newSeason });
  if (alreadyHasNewSeason > 0) {
    console.log(`${league.name} already has ${alreadyHasNewSeason} team(s) on the ${newSeason} roster — skipping carry-forward to avoid duplicating/overwriting manual edits.`);
    process.exit(0);
  }

  const priorEntries = await LeagueRoster.find({ league: league._id, season: priorSeason });
  let copied = 0;
  for (const entry of priorEntries) {
    await LeagueRoster.findOneAndUpdate(
      { league: league._id, season: newSeason, team: entry.team },
      { league: league._id, season: newSeason, team: entry.team },
      { upsert: true, setDefaultsOnInsert: true }
    );
    copied++;
  }

  console.log(`Carried forward ${copied} team(s) from season ${priorSeason} -> ${newSeason}.`);
  console.log(`\nNext: review the roster in Admin > Sports > Teams (pick "${league.name}", season ${newSeason}) and adjust for any promotions/relegations/transfers, then run:`);
  console.log(`  node syncFullSeasonFixtures.js ${slug}`);

  process.exit(0);
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});

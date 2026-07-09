// One-time fixup for the stale-season bug in leagueRosterController.js.
//
// Previously, adding a team to a league's roster only updated that team's
// `league` pointer (used by /api/teams and the site's Teams dropdown) when
// the season you added them under happened to exactly match the league's
// separately-stored `season` field. Since that field was seeded to 2024 and
// never kept in sync with what admins were actually entering, most teams
// never got their `league` pointer set at all -- which is why they were
// showing up ungrouped ("Other") in the frontend dropdown.
//
// This script finds, for every league, the newest season it has a roster
// recorded for, and sets `team.league` for every team on that season's
// roster -- exactly what should have happened automatically all along.
//
// Run once from the backend folder:
//   node fixTeamLeagues.js

require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');
const LeagueRoster = require('./models/LeagueRoster');
const Team = require('./models/Team');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const leagues = await League.find();
    let fixed = 0;
    let alreadyOk = 0;
    let noRoster = 0;

    for (const league of leagues) {
      const seasons = await LeagueRoster.find({ league: league._id }).distinct('season');
      if (seasons.length === 0) {
        noRoster++;
        continue;
      }

      const latestSeason = Math.max(...seasons);
      const entries = await LeagueRoster.find({ league: league._id, season: latestSeason });

      for (const entry of entries) {
        const team = await Team.findById(entry.team);
        if (!team) continue;

        if (String(team.league) === String(league._id)) {
          alreadyOk++;
          continue;
        }

        team.league = league._id;
        await team.save();
        fixed++;
        console.log(`  fixed: ${team.name} -> ${league.name} (${latestSeason})`);
      }
    }

    console.log(`\nDone — ${fixed} teams fixed, ${alreadyOk} already correct, ${noRoster} leagues with no roster data.`);
    process.exit(0);
  } catch (err) {
    console.error('Fixup error:', err.message);
    process.exit(1);
  }
}

run();
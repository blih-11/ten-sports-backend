const League = require('../models/League');
const Team = require('../models/Team');
const Fixture = require('../models/Fixture');
const Standing = require('../models/Standing');

// @desc    Wipe test/placeholder Teams, Fixtures, and/or Standings, and
//          optionally bulk-set every affected League's `season` field --
//          e.g. to start clean at the 2026 season (2026/27).
//          Leagues/Competitions themselves are never deleted here -- this
//          clears out the data *under* them, not the competitions.
// @route   POST /api/sports-data/reset
// body: {
//   scope: 'league' | 'sport' | 'all',
//   leagueId?: string,   // required if scope === 'league'
//   sport?: string,      // required if scope === 'sport'
//   wipeTeams?: boolean,
//   wipeFixtures?: boolean,
//   wipeStandings?: boolean,
//   resetSeasonTo?: number,  // e.g. 2026 -- applied to every affected League
// }
exports.resetSportsData = async (req, res, next) => {
  try {
    const { scope, leagueId, sport, wipeTeams, wipeFixtures, wipeStandings, resetSeasonTo } = req.body;

    if (!['league', 'sport', 'all'].includes(scope)) {
      return res.status(400).json({ success: false, message: 'scope must be "league", "sport", or "all"' });
    }
    if (scope === 'league' && !leagueId) {
      return res.status(400).json({ success: false, message: 'leagueId is required when scope is "league"' });
    }
    if (scope === 'sport' && !sport) {
      return res.status(400).json({ success: false, message: 'sport is required when scope is "sport"' });
    }

    const leagueQuery = scope === 'league' ? { _id: leagueId } : scope === 'sport' ? { sport } : {};
    const leagues = await League.find(leagueQuery);
    const leagueIds = leagues.map(l => l._id);

    if (!leagueIds.length) {
      return res.status(404).json({ success: false, message: 'No matching competitions found for that scope' });
    }

    const result = { affectedLeagues: leagues.map(l => l.name) };

    if (wipeFixtures) result.fixturesDeleted = (await Fixture.deleteMany({ league: { $in: leagueIds } })).deletedCount;
    if (wipeStandings) result.standingsDeleted = (await Standing.deleteMany({ league: { $in: leagueIds } })).deletedCount;
    if (wipeTeams) result.teamsDeleted = (await Team.deleteMany({ league: { $in: leagueIds } })).deletedCount;
    if (resetSeasonTo) {
      await League.updateMany({ _id: { $in: leagueIds } }, { $set: { season: parseInt(resetSeasonTo), lastSynced: null } });
      result.seasonResetTo = parseInt(resetSeasonTo);
      result.leaguesUpdated = leagueIds.length;
    }

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

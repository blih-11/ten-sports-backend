const LeagueRoster = require('../models/LeagueRoster');
const League = require('../models/League');
const Team = require('../models/Team');

// @desc    Get every team on a league's roster for a given season
// @route   GET /api/leagues/:id/roster?season=2026
exports.getRoster = async (req, res, next) => {
  try {
    const { season } = req.query;
    if (!season) return res.status(400).json({ success: false, message: 'season query param is required' });

    const entries = await LeagueRoster.find({ league: req.params.id, season: parseInt(season) })
      .populate('team');

    const teams = entries
      .map(e => e.team)
      .filter(Boolean) // guard against a team that was deleted but the roster row lingered
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, count: teams.length, data: teams });
  } catch (error) { next(error); }
};

// @desc    List every season this league has a recorded roster for, most recent first
// @route   GET /api/leagues/:id/roster-seasons
exports.getRosterSeasons = async (req, res, next) => {
  try {
    const seasons = await LeagueRoster.find({ league: req.params.id }).distinct('season');
    res.json({ success: true, data: seasons.sort((a, b) => b - a) });
  } catch (error) { next(error); }
};

// @desc    Add a team to a league's roster for a season. Idempotent — adding
//          a team that's already on that season's roster is a no-op, not an
//          error, so the admin UI doesn't need to check first.
// @route   POST /api/leagues/:id/roster
// @body    { teamId, season }
exports.addToRoster = async (req, res, next) => {
  try {
    const { teamId, season } = req.body;
    if (!teamId || !season) return res.status(400).json({ success: false, message: 'teamId and season are required' });

    const [league, team] = await Promise.all([
      League.findById(req.params.id),
      Team.findById(teamId),
    ]);
    if (!league) return res.status(404).json({ success: false, message: 'Competition not found' });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const seasonNum = parseInt(season);
    const entry = await LeagueRoster.findOneAndUpdate(
      { league: league._id, season: seasonNum, team: team._id },
      { league: league._id, season: seasonNum, team: team._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Keep the legacy single-league pointer in sync, but only when this
    // write is for the league's own "current" season — editing an older
    // season's roster (browsing history) should never move a team's
    // present-day league.
    if (seasonNum === league.season) {
      team.league = league._id;
      await team.save();
    }

    res.status(201).json({ success: true, data: entry });
  } catch (error) { next(error); }
};

// @desc    Remove a team from a league's roster for a season. Does not
//          delete the team itself — it just becomes free to assign
//          elsewhere (e.g. relegated to a lower division).
// @route   DELETE /api/leagues/:id/roster/:teamId?season=2026
exports.removeFromRoster = async (req, res, next) => {
  try {
    const { season } = req.query;
    if (!season) return res.status(400).json({ success: false, message: 'season query param is required' });

    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ success: false, message: 'Competition not found' });

    const seasonNum = parseInt(season);
    await LeagueRoster.findOneAndDelete({ league: league._id, season: seasonNum, team: req.params.teamId });

    // Same current-season-only rule as addToRoster, in reverse.
    if (seasonNum === league.season) {
      const team = await Team.findById(req.params.teamId);
      if (team && String(team.league) === String(league._id)) {
        team.league = null;
        await team.save();
      }
    }

    res.json({ success: true, message: 'Removed from roster' });
  } catch (error) { next(error); }
};
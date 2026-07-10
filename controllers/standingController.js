const Standing = require('../models/Standing');
const League = require('../models/League');
const Team = require('../models/Team');
const Fixture = require('../models/Fixture');

exports.getStandings = async (req, res, next) => {
  try {
    const { leagueSlug, leagueId, season } = req.query;

    let leagueDoc = null;
    if (leagueSlug) leagueDoc = await League.findOne({ slug: leagueSlug });
    else if (leagueId) leagueDoc = await League.findById(leagueId);

    if (!leagueDoc) return res.status(404).json({ success: false, message: 'League not found' });

    const targetSeason = parseInt(season) || leagueDoc.season;
    const standings = await Standing.find({ league: leagueDoc._id, season: targetSeason }).sort('rank');

    res.json({
      success: true,
      league: { name: leagueDoc.name, logo: leagueDoc.logo, slug: leagueDoc.slug },
      season: targetSeason,
      lastSynced: leagueDoc.lastSynced,
      data: standings,
    });
  } catch (err) { next(err); }
};

// For manually managed leagues — update a single team's standing entry
exports.updateStanding = async (req, res, next) => {
  try {
    const standing = await Standing.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!standing) return res.status(404).json({ success: false, message: 'Standing not found' });
    res.json({ success: true, data: standing });
  } catch (err) { next(err); }
};

// Manual single-row add (e.g. a team not yet in the Team collection, or a
// one-off adjustment) — used by the admin's "Add Row" form.
exports.createStanding = async (req, res, next) => {
  try {
    const { league, season, rank, team, points, played, won, drawn, lost, goalsFor, goalsAgainst, form, description } = req.body;
    if (!league || !season) return res.status(400).json({ success: false, message: 'league and season are required' });
    const goalDiff = (parseInt(goalsFor) || 0) - (parseInt(goalsAgainst) || 0);
    const standing = await Standing.create({
      league, season, rank: parseInt(rank) || 0, team, points: parseInt(points) || 0,
      played: parseInt(played) || 0, won: parseInt(won) || 0, drawn: parseInt(drawn) || 0, lost: parseInt(lost) || 0,
      goalsFor: parseInt(goalsFor) || 0, goalsAgainst: parseInt(goalsAgainst) || 0, goalDiff,
      form: form || '', description: description || '',
    });
    res.status(201).json({ success: true, data: standing });
  } catch (err) { next(err); }
};

exports.deleteStanding = async (req, res, next) => {
  try {
    const standing = await Standing.findByIdAndDelete(req.params.id);
    if (!standing) return res.status(404).json({ success: false, message: 'Standing not found' });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};

// ── Shared table computation ─────────────────────────────────────────────────
// Rebuilds the ENTIRE standings table for a league/season from scratch:
//   1. Start with every team registered to the league (Team.league) — this
//      guarantees every team appears even with zero finished fixtures.
//   2. Fold in every finished ('FT'), scored fixture stored for that league
//      + season to accumulate played/won/drawn/lost/goals/points.
//   3. Sort by points -> goal difference -> goals for -> name (alphabetical
///     tiebreak). Since every team starts at 0 in every column, this means:
//      before a ball is kicked, the table comes out alphabetical with every
//      stat at 0 -- exactly what "Generate from Results" already promised,
//      it just wasn't implemented. As results come in it naturally becomes
//      a real live table, no separate "init" step needed.
// Works identically for every league/competition — nothing here is specific
// to any one competition, so calling this after any fixture is added/edited
// keeps that competition's table in sync automatically.
async function computeStandingsTable(leagueId, season) {
  const teams = await Team.find({ league: leagueId }).sort('name');
  const fixtures = await Fixture.find({ league: leagueId, season, 'status.short': 'FT' });

  const table = new Map(); // key -> row
  const keyFor = (ref, name) => (ref ? String(ref) : `name:${name}`);

  teams.forEach(t => {
    table.set(String(t._id), {
      teamRef: t._id, name: t.name, logo: t.logo || '', apiId: t.apiId || null,
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
    });
  });

  function getRow(side) {
    const key = keyFor(side.ref, side.name);
    if (!table.has(key)) {
      table.set(key, {
        teamRef: side.ref || null, name: side.name, logo: side.logo || '', apiId: side.apiId || null,
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
      });
    }
    return table.get(key);
  }

  for (const fx of fixtures) {
    if (fx.score?.home == null || fx.score?.away == null) continue;
    const home = getRow(fx.homeTeam);
    const away = getRow(fx.awayTeam);

    home.played++; away.played++;
    home.goalsFor += fx.score.home; home.goalsAgainst += fx.score.away;
    away.goalsFor += fx.score.away; away.goalsAgainst += fx.score.home;

    if (fx.score.home > fx.score.away) { home.won++; home.points += 3; away.lost++; }
    else if (fx.score.home < fx.score.away) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }

  const rows = Array.from(table.values()).map(r => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }));
  rows.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.name.localeCompare(b.name)
  );

  await Standing.deleteMany({ league: leagueId, season });
  if (!rows.length) return [];

  const docs = rows.map((r, i) => ({
    league: leagueId, season, rank: i + 1,
    team: { ref: r.teamRef, name: r.name, logo: r.logo, apiId: r.apiId },
    points: r.points, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost,
    goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, goalDiff: r.goalDiff,
  }));
  return Standing.insertMany(docs);
}

exports.generateStandings = async (req, res, next) => {
  try {
    const { league, season } = req.body;
    if (!league || !season) return res.status(400).json({ success: false, message: 'league and season are required' });
    const docs = await computeStandingsTable(league, parseInt(season));
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) { next(err); }
};

exports.computeStandingsTable = computeStandingsTable;

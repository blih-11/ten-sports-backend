const mongoose = require('mongoose');

// Season-scoped membership: which teams played in a given competition during
// a given season. This is what actually preserves history — Team.league is
// only ever "whichever league the team is in right now" and gets overwritten
// on every promotion/relegation, so it can't answer "who was in the
// Bundesliga in 26/27" once 27/28 starts. This collection can.
//
// `season` follows the same convention as Fixture/Standing: the year the
// season started in (e.g. 2026 for the 2026/27 season).
const leagueRosterSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  season: { type: Number, required: true },
  team:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
}, { timestamps: true });

// A team can only appear once per league per season.
leagueRosterSchema.index({ league: 1, season: 1, team: 1 }, { unique: true });
// Fast lookup for "give me the roster for this league+season".
leagueRosterSchema.index({ league: 1, season: 1 });

module.exports = mongoose.model('LeagueRoster', leagueRosterSchema);
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  minute:  { type: Number },
  type:    { type: String }, // 'Goal', 'Card', 'Subst'
  detail:  { type: String }, // 'Normal Goal', 'Yellow Card' etc
  team:    { type: String },
  player:  { type: String },
  assist:  { type: String, default: null },
}, { _id: false });

const lineupPlayerSchema = new mongoose.Schema({
  name:     { type: String },
  number:   { type: Number },
  position: { type: String },
  grid:     { type: String, default: null }, // e.g. "1:1" for formation grid
}, { _id: false });

const fixtureSchema = new mongoose.Schema({
  apiId:       { type: Number, default: null, index: true },
  league:      { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  season:      { type: Number, required: true },
  round:       { type: String, default: '' },
  date:        { type: Date, required: true },
  status: {
    long:  { type: String, default: 'Not Started' }, // 'Match Finished', 'First Half' etc
    short: { type: String, default: 'NS' },           // 'FT', '1H', 'HT', 'NS' etc
    elapsed: { type: Number, default: null },
  },
  homeTeam: {
    ref:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    name:   { type: String, required: true },
    logo:   { type: String, default: '' },
    apiId:  { type: Number, default: null },
  },
  awayTeam: {
    ref:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    name:   { type: String, required: true },
    logo:   { type: String, default: '' },
    apiId:  { type: Number, default: null },
  },
  score: {
    home:     { type: Number, default: null },
    away:     { type: Number, default: null },
    htHome:   { type: Number, default: null },
    htAway:   { type: Number, default: null },
  },
  venue:   { type: String, default: '' },
  events:  [eventSchema],
  lineups: {
    home: {
      formation:   { type: String, default: '' },
      startXI:     [lineupPlayerSchema],
      substitutes: [lineupPlayerSchema],
      coach:       { type: String, default: '' },
    },
    away: {
      formation:   { type: String, default: '' },
      startXI:     [lineupPlayerSchema],
      substitutes: [lineupPlayerSchema],
      coach:       { type: String, default: '' },
    },
  },
  stats: {
    home: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    away: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  },
  isManual: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index so we never duplicate an API fixture. Must exclude
// null apiId, not just missing — the schema default sets apiId to null,
// so every doc "has" the field even when it's a manual fixture. Using
// { $exists: true } alone matched null values too, which meant manual
// fixtures (apiId always null) collided with each other under this
// unique index. $ne: null keeps the uniqueness guarantee for real
// API-synced fixtures while leaving manual ones alone.
fixtureSchema.index({ apiId: 1, season: 1 }, { unique: true, partialFilterExpression: { apiId: { $exists: true, $ne: null } } });

module.exports = mongoose.model('Fixture', fixtureSchema);
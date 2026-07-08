const mongoose = require('mongoose');

const standingSchema = new mongoose.Schema({
  league:  { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  season:  { type: Number, required: true },
  rank:    { type: Number, required: true },
  team: {
    ref:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    name:  { type: String, required: true },
    logo:  { type: String, default: '' },
    apiId: { type: Number, default: null },
  },
  points:      { type: Number, default: 0 },
  played:      { type: Number, default: 0 },
  won:         { type: Number, default: 0 },
  drawn:       { type: Number, default: 0 },
  lost:        { type: Number, default: 0 },
  goalsFor:    { type: Number, default: 0 },
  goalsAgainst:{ type: Number, default: 0 },
  goalDiff:    { type: Number, default: 0 },
  form:        { type: String, default: '' }, // e.g. "WWDLW"
  description: { type: String, default: '' }, // e.g. "Promotion - Champions League"
}, { timestamps: true });

standingSchema.index({ league: 1, season: 1, rank: 1 });

module.exports = mongoose.model('Standing', standingSchema);

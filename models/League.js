const mongoose = require('mongoose');

const leagueSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  slug:       { type: String, required: true, unique: true },
  logo:       { type: String, default: '' },
  country:    { type: String, default: '' },
  sport:      { type: String, enum: ['football', 'tennis', 'formula-1', 'nfl', 'nba', 'rugby', 'golf', 'boxing'], default: 'football' },
  apiId:      { type: Number, default: null },   // API-Sports league ID
  season:     { type: Number, default: 2025 },   // current season year
  isActive:   { type: Boolean, default: true },
  isManual:   { type: Boolean, default: false },  // false = pull from API, true = manual entry
  lastSynced: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('League', leagueSchema);

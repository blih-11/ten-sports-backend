const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true },
  photo:       { type: String, default: '' },
  nationality: { type: String, default: '' },
  position:    { type: String, default: '' },
  number:      { type: Number, default: null },
  age:         { type: Number, default: null },
  team:        { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  sport:       { type: String, default: 'football' },
  apiId:       { type: Number, default: null },
  isManual:    { type: Boolean, default: false },
  stats: {
    appearances: { type: Number, default: 0 },
    goals:       { type: Number, default: 0 },
    assists:     { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards:    { type: Number, default: 0 },
    minutesPlayed: { type: Number, default: 0 },
    // basketball / other sports
    points:      { type: Number, default: 0 },
    rebounds:    { type: Number, default: 0 },
    assists2:    { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  shortName:  { type: String, default: '' },
  slug:       { type: String, required: true, unique: true },
  logo:       { type: String, default: '' },
  country:    { type: String, default: '' },
  founded:    { type: Number, default: null },
  stadium:    { type: String, default: '' },
  league:     { type: mongoose.Schema.Types.ObjectId, ref: 'League' },
  sport:      { type: String, default: 'football' },
  apiId:      { type: Number, default: null },
  isManual:   { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);

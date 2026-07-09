const mongoose = require('mongoose');

// Stores admin-editable overrides for the bundled static logo library
// (public/logos/teams and public/logos/competitions on the frontend/admin).
// Only entries that have actually been customized get a document here --
// everything else just falls back to the raw filename slug, title-cased.
//
// kind + slug uniquely identify a bundled logo file, e.g.
//   { kind: 'team', slug: 'manchester-united' }        -> public/logos/teams/manchester-united.png
//   { kind: 'competition', slug: 'champions-league' }  -> public/logos/competitions/champions-league.svg
const logoAliasSchema = new mongoose.Schema({
  kind:        { type: String, enum: ['team', 'competition'], required: true },
  slug:        { type: String, required: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  aliases:     [{ type: String, trim: true, lowercase: true }], // extra search terms, e.g. "man utd", "mufc"
}, { timestamps: true });

logoAliasSchema.index({ kind: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('LogoAlias', logoAliasSchema);

// One-off fix: drop the old (broken) apiId_1_season_1 index on the
// fixtures collection. Needed because Mongoose won't rewrite an existing
// index just because models/Fixture.js changed — the bad partial filter
// is baked into the index as it currently exists in MongoDB. Run this
// once after replacing models/Fixture.js with the corrected version;
// Mongoose will then recreate the index correctly (with autoIndex on,
// which is the default) the next time anything touches the Fixture model.
//
// Safe to run multiple times — if the index is already gone, it just
// logs that and moves on instead of erroring out.
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.collection('fixtures');
  const indexes = await collection.indexes();
  const target = indexes.find(i => i.name === 'apiId_1_season_1');

  if (!target) {
    console.log('No index named "apiId_1_season_1" found — nothing to drop (already fixed, or collection is empty/new).');
    process.exit(0);
  }

  console.log('Found existing index:', JSON.stringify(target));
  await collection.dropIndex('apiId_1_season_1');
  console.log('Dropped index "apiId_1_season_1".');
  console.log('Mongoose will recreate it correctly (per the updated Fixture.js schema) next time your server starts or a script touches the Fixture model.');

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
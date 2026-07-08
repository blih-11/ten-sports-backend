require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const collection = mongoose.connection.collection('fixtures');

    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    if (indexes.some(i => i.name === 'apiId_1_season_1')) {
      await collection.dropIndex('apiId_1_season_1');
      console.log('Dropped old apiId_1_season_1 index');
    }

    // Partial index: only enforces uniqueness on docs that actually HAVE an apiId.
    // Unlike `sparse`, this correctly ignores docs where apiId is missing,
    // even if other fields in the index (like season) are present.
    await collection.createIndex(
      { apiId: 1, season: 1 },
      { unique: true, partialFilterExpression: { apiId: { $exists: true } } }
    );
    console.log('Created new partial unique index on {apiId, season}');

    const after = await collection.indexes();
    console.log('Indexes now:', JSON.stringify(after, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error fixing index:', err.message);
    process.exit(1);
  }
}

fixIndex();
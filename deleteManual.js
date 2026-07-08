require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.collection('fixtures').deleteMany({ isManual: true, apiId: null });
  console.log('Deleted:', result.deletedCount);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
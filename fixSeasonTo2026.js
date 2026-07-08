// One-off fix: force every football league's season back to 2026,
// regardless of its current value (unlike updateSeason2026.js, which only
// bumps leagues where season < 2026 — that won't touch leagues currently
// sitting at 2027).
require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await League.updateMany(
    { sport: 'football' },
    { $set: { season: 2026 } }
  );
  console.log(`Forced ${result.modifiedCount} football leagues to season 2026`);

  process.exit(0);
}

fix().catch(err => {
  console.error(err.message);
  process.exit(1);
});

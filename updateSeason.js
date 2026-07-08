require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await League.updateMany(
    { sport: 'football', season: 2024 },
    { $set: { season: 2025 } }
  );
  console.log(`Updated ${result.modifiedCount} football leagues to season 2025`);

  // NBA/NFL stay on 2024 since their 24/25 season runs into 2025
  // Formula 1 was already 2025
  process.exit(0);
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
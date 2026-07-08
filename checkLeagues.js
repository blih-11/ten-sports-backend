require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const leagues = await League.find({}, 'name season lastSynced');
  leagues.forEach(l => console.log(`${l.name} — season: ${l.season} — last synced: ${l.lastSynced}`));
  process.exit(0);
});
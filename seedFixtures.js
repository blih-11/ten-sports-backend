require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');

const FINISHED = [
  { home: 'Liverpool',         away: 'Manchester City',  scoreHome: 2, scoreAway: 1, daysAgo: 1 },
  { home: 'Arsenal',           away: 'Chelsea',           scoreHome: 1, scoreAway: 1, daysAgo: 2 },
  { home: 'Newcastle United',  away: 'Tottenham',         scoreHome: 3, scoreAway: 0, daysAgo: 3 },
  { home: 'Manchester United', away: 'Aston Villa',       scoreHome: 0, scoreAway: 2, daysAgo: 4 },
  { home: 'Brighton',          away: 'West Ham',          scoreHome: 2, scoreAway: 2, daysAgo: 5 },
  { home: 'Fulham',            away: 'Crystal Palace',    scoreHome: 1, scoreAway: 0, daysAgo: 6 },
];

const UPCOMING = [
  { home: 'Chelsea',         away: 'Liverpool',         daysAhead: 2 },
  { home: 'Manchester City', away: 'Arsenal',           daysAhead: 3 },
  { home: 'Tottenham',       away: 'Manchester United', daysAhead: 4 },
  { home: 'Aston Villa',     away: 'Newcastle United',  daysAhead: 5 },
];

async function createManualFixture(attrs) {
  // Use native driver to bypass Mongoose schema defaults (avoids apiId: null collision)
  const result = await mongoose.connection.collection('fixtures').insertOne({
    ...attrs,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result;
}

async function seedFixtures() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const league = await League.findOne({ slug: 'premier-league' });
    if (!league) {
      console.error('Premier League not found — run seedLeagues.js first');
      process.exit(1);
    }

    let created = 0;
    let skipped = 0;

    for (const m of FINISHED) {
      const exists = await mongoose.connection.collection('fixtures').findOne({
        league: league._id,
        season: league.season,
        'homeTeam.name': m.home,
        'awayTeam.name': m.away,
        isManual: true,
      });

      if (exists) {
        console.log(`  skipped (exists): ${m.home} vs ${m.away}`);
        skipped++;
        continue;
      }

      const date = new Date();
      date.setDate(date.getDate() - m.daysAgo);

      await createManualFixture({
        league: league._id,
        season: league.season,
        round: 'Regular Season',
        date,
        status: { long: 'Match Finished', short: 'FT', elapsed: 90 },
        homeTeam: { name: m.home, logo: '' },
        awayTeam: { name: m.away, logo: '' },
        score: { home: m.scoreHome, away: m.scoreAway },
        isManual: true,
      });

      console.log(`  created (FT): ${m.home} ${m.scoreHome}-${m.scoreAway} ${m.away}`);
      created++;
    }

    for (const m of UPCOMING) {
      const exists = await mongoose.connection.collection('fixtures').findOne({
        league: league._id,
        season: league.season,
        'homeTeam.name': m.home,
        'awayTeam.name': m.away,
        isManual: true,
      });

      if (exists) {
        console.log(`  skipped (exists): ${m.home} vs ${m.away}`);
        skipped++;
        continue;
      }

      const date = new Date();
      date.setDate(date.getDate() + m.daysAhead);
      date.setHours(15, 0, 0, 0);

      await createManualFixture({
        league: league._id,
        season: league.season,
        round: 'Regular Season',
        date,
        status: { long: 'Not Started', short: 'NS', elapsed: null },
        homeTeam: { name: m.home, logo: '' },
        awayTeam: { name: m.away, logo: '' },
        score: { home: null, away: null },
        isManual: true,
      });

      console.log(`  created (NS): ${m.home} vs ${m.away}`);
      created++;
    }

    console.log(`\nDone — ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedFixtures();
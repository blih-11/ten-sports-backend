require('dotenv').config();
const mongoose = require('mongoose');
const League = require('./models/League');
const Standing = require('./models/Standing');

const PREMIER_LEAGUE_TABLE = [
  { rank: 1,  name: 'Liverpool',        points: 71, played: 30, won: 22, drawn: 5, lost: 3,  goalsFor: 68, goalsAgainst: 32, form: 'WWDWW' },
  { rank: 2,  name: 'Arsenal',          points: 64, played: 30, won: 18, drawn: 10, lost: 2, goalsFor: 58, goalsAgainst: 26, form: 'WDWWD' },
  { rank: 3,  name: 'Manchester City',  points: 60, played: 30, won: 18, drawn: 6, lost: 6,  goalsFor: 62, goalsAgainst: 35, form: 'LWWDW' },
  { rank: 4,  name: 'Chelsea',          points: 56, played: 30, won: 16, drawn: 8, lost: 6,  goalsFor: 54, goalsAgainst: 38, form: 'WWLWD' },
  { rank: 5,  name: 'Newcastle United', points: 53, played: 30, won: 15, drawn: 8, lost: 7,  goalsFor: 50, goalsAgainst: 36, form: 'DWWLW' },
  { rank: 6,  name: 'Aston Villa',      points: 50, played: 30, won: 14, drawn: 8, lost: 8,  goalsFor: 45, goalsAgainst: 40, form: 'WLDWW' },
  { rank: 7,  name: 'Brighton',         points: 47, played: 30, won: 12, drawn: 11, lost: 7, goalsFor: 42, goalsAgainst: 38, form: 'DDWLW' },
  { rank: 8,  name: 'Tottenham',        points: 46, played: 30, won: 13, drawn: 7, lost: 10, goalsFor: 51, goalsAgainst: 47, form: 'LWWLD' },
  { rank: 9,  name: 'Manchester United',points: 43, played: 30, won: 12, drawn: 7, lost: 11, goalsFor: 40, goalsAgainst: 42, form: 'WLDLW' },
  { rank: 10, name: 'West Ham',         points: 41, played: 30, won: 11, drawn: 8, lost: 11, goalsFor: 39, goalsAgainst: 44, form: 'LDWLL' },
  { rank: 11, name: 'Fulham',           points: 39, played: 30, won: 10, drawn: 9, lost: 11, goalsFor: 36, goalsAgainst: 40, form: 'DWLDW' },
  { rank: 12, name: 'Brentford',        points: 38, played: 30, won: 10, drawn: 8, lost: 12, goalsFor: 41, goalsAgainst: 46, form: 'LLWDW' },
  { rank: 13, name: 'Crystal Palace',   points: 36, played: 30, won: 9,  drawn: 9, lost: 12, goalsFor: 34, goalsAgainst: 42, form: 'DLWLD' },
  { rank: 14, name: 'Everton',          points: 35, played: 30, won: 9,  drawn: 8, lost: 13, goalsFor: 30, goalsAgainst: 41, form: 'WDLLD' },
  { rank: 15, name: 'Wolves',           points: 33, played: 30, won: 8,  drawn: 9, lost: 13, goalsFor: 33, goalsAgainst: 47, form: 'LDLWL' },
  { rank: 16, name: 'Bournemouth',      points: 32, played: 30, won: 8,  drawn: 8, lost: 14, goalsFor: 35, goalsAgainst: 48, form: 'LWLDL' },
  { rank: 17, name: 'Nottingham Forest',points: 31, played: 30, won: 7,  drawn: 10, lost: 13,goalsFor: 29, goalsAgainst: 45, form: 'DLLWD' },
  { rank: 18, name: 'Leicester City',   points: 27, played: 30, won: 6,  drawn: 9, lost: 15, goalsFor: 28, goalsAgainst: 50, form: 'LLDLL' },
  { rank: 19, name: 'Ipswich Town',     points: 23, played: 30, won: 5,  drawn: 8, lost: 17, goalsFor: 24, goalsAgainst: 54, form: 'LLLDL' },
  { rank: 20, name: 'Southampton',      points: 18, played: 30, won: 3,  drawn: 9, lost: 18, goalsFor: 20, goalsAgainst: 58, form: 'LLDLL' },
];

async function seedStandings() {
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

    for (const row of PREMIER_LEAGUE_TABLE) {
      const existing = await Standing.findOne({ league: league._id, season: league.season, 'team.name': row.name });
      if (existing) {
        console.log(`  skipped (exists): ${row.name}`);
        skipped++;
        continue;
      }

      await Standing.create({
        league: league._id,
        season: league.season,
        rank: row.rank,
        team: { name: row.name, logo: '', apiId: null },
        points: row.points,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDiff: row.goalsFor - row.goalsAgainst,
        form: row.form,
        description: row.rank <= 4 ? 'Champions League' : row.rank === 5 ? 'Europa League' : row.rank >= 18 ? 'Relegation' : '',
      });
      console.log(`  created: ${row.rank}. ${row.name}`);
      created++;
    }

    console.log(`\nDone — ${created} created, ${skipped} skipped`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedStandings();
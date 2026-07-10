// Manual fixture import from a CSV file — no external API needed.
//
// Usage:
//   node importFixturesFromCSV.js <league-slug> <path-to-csv>
//   node importFixturesFromCSV.js premier-league fixtures/premier-league.csv
//
// CSV columns (header row required, any order, extra columns ignored):
//   date        required   YYYY-MM-DD              e.g. 2026-08-15
//   time        optional   HH:MM (24h, local)       e.g. 15:00  (defaults to 12:00 if blank)
//   home        required   team name — must match a Team already seeded
//   away        required   team name — must match a Team already seeded
//   round       optional   e.g. "Matchday 1" (defaults to '')
//   homeScore   optional   leave blank for not-yet-played fixtures
//   awayScore   optional   leave blank for not-yet-played fixtures
//
// Status is inferred automatically:
//   both scores present -> Match Finished / FT
//   otherwise           -> Not Started / NS
//
// Safe to re-run: fixtures are upserted by (league, season, date, home, away),
// so editing a row's score and re-running updates that same fixture rather
// than creating a duplicate — handy for filling in results after matches
// are played.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const League = require('./models/League');
const Team = require('./models/Team');
const Fixture = require('./models/Fixture');

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    // Simple split is fine here since team/round names won't contain commas.
    // Supports quoted fields just in case (e.g. "Round 1, Group A").
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { cells.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

// Common shorthand/nicknames -> canonical Team.name used in the DB.
// Add to this as you run into more mismatches.
const ALIASES = {
  'man city': 'Manchester City', 'man utd': 'Manchester United', 'man united': 'Manchester United',
  'spurs': 'Tottenham Hotspur', 'tottenham': 'Tottenham Hotspur',
  'brighton': 'Brighton & Hove Albion',
  'wolves': 'Wolverhampton Wanderers',
  'newcastle': 'Newcastle United',
  'leeds': 'Leeds United',
  'forest': 'Nottingham Forest', "nott'm forest": 'Nottingham Forest',
  'west ham': 'West Ham United',
  'west brom': 'West Bromwich Albion', 'wba': 'West Bromwich Albion',
  'sheff utd': 'Sheffield United', 'sheffield utd': 'Sheffield United',
  'qpr': 'Queens Park Rangers',
  'coventry': 'Coventry City', 'ipswich': 'Ipswich Town', 'hull': 'Hull City',
  'preston': 'Preston North End', 'bristol city': 'Bristol City',
  'charlton': 'Charlton Athletic', 'derby': 'Derby County',
  'boro': 'Middlesbrough', 'norwich': 'Norwich City',
  'birmingham': 'Birmingham City', 'stoke': 'Stoke City', 'swansea': 'Swansea City',
  'cardiff': 'Cardiff City',
};

// Normalize for comparison: lowercase, strip accents/punctuation, drop noise
// words like "FC"/"AFC"/"CF" and "&"/"and", collapse whitespace. This lets
// a CSV say "brighton", "Brighton and Hove Albion", or "BRIGHTON & HOVE
// ALBION FC" and still match the one Team document in the DB.
function normalize(str) {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/\b(fc|afc|cf|sc|ac)\b/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let teamCache = null;
async function findTeam(rawName) {
  if (!teamCache) teamCache = await Team.find({});
  const alias = ALIASES[rawName.trim().toLowerCase()];
  const target = normalize(alias || rawName);
  // exact normalized match first, then "contains" fallback for partial names
  return teamCache.find(t => normalize(t.name) === target)
      || teamCache.find(t => normalize(t.name).includes(target) || target.includes(normalize(t.name)));
}

async function run() {
  const [, , leagueSlug, csvPath] = process.argv;
  if (!leagueSlug || !csvPath) {
    console.error('Usage: node importFixturesFromCSV.js <league-slug> <path-to-csv>');
    process.exit(1);
  }

  const fullPath = path.resolve(csvPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`CSV file not found: ${fullPath}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const league = await League.findOne({ slug: leagueSlug });
  if (!league) {
    console.error(`No league found with slug "${leagueSlug}". Check seedLeagues.js for the correct slug.`);
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(fullPath, 'utf8'));
  console.log(`\n${league.name} (season ${league.season}) — ${rows.length} row(s) in CSV\n`);

  let created = 0, updated = 0, skipped = 0;

  for (const [i, row] of rows.entries()) {
    const lineNo = i + 2; // +2 = header row + 1-indexing
    if (!row.date || !row.home || !row.away) {
      console.log(`  ! line ${lineNo}: missing date/home/away — skipped`);
      skipped++;
      continue;
    }

    const [hh, mm] = (row.time || '12:00').split(':').map(Number);
    const date = new Date(row.date);
    if (isNaN(date.getTime())) {
      console.log(`  ! line ${lineNo}: bad date "${row.date}" — skipped`);
      skipped++;
      continue;
    }
    date.setHours(hh || 12, mm || 0, 0, 0);

    const homeTeam = await findTeam(row.home);
    const awayTeam = await findTeam(row.away);
    if (!homeTeam) console.log(`  ! line ${lineNo}: no Team match for "${row.home}" (fixture still saved, just without logo/ref — check spelling or add an alias)`);
    if (!awayTeam) console.log(`  ! line ${lineNo}: no Team match for "${row.away}" (fixture still saved, just without logo/ref — check spelling or add an alias)`);

    const hasScores = row.homeScore !== '' && row.awayScore !== '' && row.homeScore != null && row.awayScore != null;
    const status = hasScores
      ? { long: 'Match Finished', short: 'FT', elapsed: 90 }
      : { long: 'Not Started', short: 'NS', elapsed: null };

    const canonicalHome = homeTeam?.name || row.home;
    const canonicalAway = awayTeam?.name || row.away;

    const doc = {
      league: league._id,
      season: league.season,
      round: row.round || '',
      date,
      status,
      homeTeam: { name: canonicalHome, logo: homeTeam?.logo || '', ref: homeTeam?._id || null },
      awayTeam: { name: canonicalAway, logo: awayTeam?.logo || '', ref: awayTeam?._id || null },
      score: {
        home: hasScores ? Number(row.homeScore) : null,
        away: hasScores ? Number(row.awayScore) : null,
      },
      isManual: true,
    };

    const result = await Fixture.findOneAndUpdate(
      { league: league._id, season: league.season, 'homeTeam.name': canonicalHome, 'awayTeam.name': canonicalAway, date, isManual: true },
      { $set: doc },
      { upsert: true, new: true, rawResult: true }
    );

    if (result.lastErrorObject?.updatedExisting) {
      console.log(`  = updated: ${canonicalHome} vs ${canonicalAway} (${row.date})`);
      updated++;
    } else {
      console.log(`  + created: ${canonicalHome} vs ${canonicalAway} (${row.date})`);
      created++;
    }
  }

  console.log(`\nDone — ${created} created, ${updated} updated, ${skipped} skipped.`);

  try {
    const { computeStandingsTable } = require('./controllers/standingController');
    await computeStandingsTable(league._id, league.season);
    console.log(`Standings table recomputed for ${league.name} (season ${league.season}).`);
  } catch (err) {
    console.error('Could not recompute standings table:', err.message);
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Import error:', err.message);
  process.exit(1);
});
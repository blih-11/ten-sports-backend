// One-time full-season fixture import.
//
// jobs/sportsSync.js's daily cron only ever pulls "next 10 + last 10"
// fixtures per league — that's fine for keeping things fresh, but it will
// never give you the complete 26/27 schedule up front. This script pulls
// the ENTIRE season's fixture list in one go (api-sports.io's /fixtures
// endpoint returns everything for a league+season when you don't pass
// next/last), and upserts it the same way the regular sync does — so
// running this once, then letting the existing cron take over, is enough.
//
// Requires SPORTS_API_KEY in your .env (see api-sports.io — free tier is
// ~100 requests/day, one request per league here).
//
// Run for every football league:      node syncFullSeasonFixtures.js
// Run for just one league (by slug):  node syncFullSeasonFixtures.js premier-league
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const League = require('./models/League');
const Fixture = require('./models/Fixture');

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.SPORTS_API_KEY },
});

async function importLeague(league) {
  console.log(`\n${league.name} (apiId ${league.apiId}, season ${league.season})...`);
  const res = await client.get('/fixtures', { params: { league: league.apiId, season: league.season } });
  const fixtures = res.data?.response || [];

  // Diagnostics — api-sports.io returns a 200 with an empty `response` array
  // even when something's wrong (bad key, plan doesn't cover this
  // league/season, rate limit, etc). The real reason is usually in
  // `errors` or the account/subscription block, so surface those instead
  // of guessing.
  if (!fixtures.length) {
    console.log(`  results: ${res.data?.results}, paging: ${JSON.stringify(res.data?.paging)}`);
    if (res.data?.errors && Object.keys(res.data.errors).length) {
      console.log(`  API errors:`, res.data.errors);
    }
    if (res.headers) {
      console.log(`  rate limit remaining: ${res.headers['x-ratelimit-requests-remaining']}`);
    }
    console.log(`  No fixtures returned — either the fixture list isn't released yet, or the API key/apiId/season is wrong.`);
    return 0;
  }

  for (const f of fixtures) {
    const doc = {
      apiId: f.fixture.id, league: league._id, season: league.season, round: f.league.round || '',
      date: new Date(f.fixture.date),
      status: { long: f.fixture.status.long, short: f.fixture.status.short, elapsed: f.fixture.status.elapsed },
      homeTeam: { name: f.teams.home.name, logo: f.teams.home.logo, apiId: f.teams.home.id },
      awayTeam: { name: f.teams.away.name, logo: f.teams.away.logo, apiId: f.teams.away.id },
      score: { home: f.goals.home, away: f.goals.away, htHome: f.score.halftime.home, htAway: f.score.halftime.away },
      venue: f.fixture.venue?.name || '',
    };
    await Fixture.findOneAndUpdate({ apiId: f.fixture.id }, { $set: doc }, { upsert: true, new: true });
  }
  console.log(`  Imported ${fixtures.length} fixtures.`);
  return fixtures.length;
}

async function run() {
  if (!process.env.SPORTS_API_KEY) {
    console.error('SPORTS_API_KEY not set in .env — get one from api-sports.io first.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Check what your api-sports.io plan actually covers before importing —
  // free/demo plans are commonly locked to specific leagues/seasons, which
  // would explain an empty `response` even with correct params.
  try {
    const statusRes = await client.get('/status');
    console.log('\nAPI account status:', JSON.stringify(statusRes.data?.response?.subscription || statusRes.data, null, 2));
  } catch (err) {
    console.log('\nCould not fetch /status:', err.response?.data || err.message);
  }

  const onlySlug = process.argv[2]; // optional: node syncFullSeasonFixtures.js premier-league
  const query = { sport: 'football', isActive: true, isManual: false, apiId: { $ne: null } };
  if (onlySlug) query.slug = onlySlug;

  const leagues = await League.find(query);
  if (!leagues.length) {
    console.log(onlySlug ? `No matching league found for slug "${onlySlug}".` : 'No football leagues found to import.');
    process.exit(0);
  }

  let total = 0;
  for (const league of leagues) {
    try {
      total += await importLeague(league);
      await League.findByIdAndUpdate(league._id, { lastSynced: new Date() });
    } catch (err) {
      console.error(`  Error importing ${league.name}:`, err.response?.data?.message || err.message);
    }
    // Respect free-tier rate limits between leagues.
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\nDone — ${total} fixtures imported across ${leagues.length} league(s).`);
  process.exit(0);
}

run().catch(err => {
  console.error('Import error:', err.message);
  process.exit(1);
});
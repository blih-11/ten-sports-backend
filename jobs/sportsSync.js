const axios = require('axios');
const League = require('../models/League');
const Team = require('../models/Team');
const Standing = require('../models/Standing');
const Fixture = require('../models/Fixture');

// ── API CLIENTS ──────────────────────────────────────────────────────────────
// All api-sports.io sub-APIs share one key and (mostly) one response shape:
// { response: [...] }. Football is the fully verified implementation from
// before. Basketball/NBA/Rugby/NFL below follow the same documented
// /games + /standings pattern the vendor uses across their whole product
// line -- but I have not been able to run these against a live key to
// confirm exact field names (e.g. quarter/period score breakdowns), so
// they're written defensively (optional chaining, skip-and-log on
// unexpected shape) rather than assumed correct. Verify against a real
// response and adjust field paths if anything looks off before relying on
// this for a real event.

const CLIENTS = {
  football:   { baseURL: 'https://v3.football.api-sports.io' },
  basketball: { baseURL: 'https://v1.basketball.api-sports.io' }, // generic basketball leagues (EuroLeague etc), NOT NBA
  nba:        { baseURL: 'https://v2.nba.api-sports.io' },         // NBA has its own dedicated API, different shape to generic basketball
  rugby:      { baseURL: 'https://v1.rugby.api-sports.io' },
  nfl:        { baseURL: 'https://v1.american-football.api-sports.io' },
};

function clientFor(key) {
  return axios.create({
    baseURL: CLIENTS[key].baseURL,
    headers: { 'x-apisports-key': process.env.SPORTS_API_KEY },
  });
}

// Maps a League.sport value to which API client + sync strategy to use.
// tennis/golf/boxing intentionally have no entry -- see note at the bottom
// of this file.
const SPORT_CLIENT_KEY = {
  football: 'football',
  nba: 'nba',
  rugby: 'rugby',
  nfl: 'nfl',
  // A generic "basketball" League.sport value isn't in the current enum,
  // but if you add non-NBA basketball leagues (EuroLeague etc), map them
  // here to 'basketball' rather than 'nba'.
};

// ── FOOTBALL (verified, unchanged from before) ───────────────────────────────
async function syncStandingsFootball(league, client) {
  const res = await client.get('/standings', { params: { league: league.apiId, season: league.season } });
  const response = res.data?.response;
  if (!response?.length) { console.log(`[sync] No standings response for ${league.name}`); return; }
  const standingsData = response[0]?.league?.standings?.[0];
  if (!standingsData?.length) { console.log(`[sync] Empty standings array for ${league.name}`); return; }

  await Standing.deleteMany({ league: league._id, season: league.season });
  const docs = standingsData.map(s => ({
    league: league._id, season: league.season, rank: s.rank, points: s.points,
    played: s.all.played, won: s.all.win, drawn: s.all.draw, lost: s.all.lose,
    goalsFor: s.all.goals.for, goalsAgainst: s.all.goals.against, goalDiff: s.goalsDiff,
    form: s.form || '', description: s.description || '',
    team: { name: s.team.name, logo: s.team.logo, apiId: s.team.id },
  }));
  await Standing.insertMany(docs);
  console.log(`[sync] Standings updated for ${league.name} (${docs.length} teams)`);
}

async function syncFixturesFootball(league, client) {
  const [nextRes, lastRes] = await Promise.all([
    client.get('/fixtures', { params: { league: league.apiId, season: league.season, next: 10 } }),
    client.get('/fixtures', { params: { league: league.apiId, season: league.season, last: 10 } }),
  ]);
  const fixtures = [...(nextRes.data?.response || []), ...(lastRes.data?.response || [])];

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
  console.log(`[sync] Fixtures updated for ${league.name} (${fixtures.length} fixtures)`);
}

// ── BASKETBALL / RUGBY / NFL family (api-sports v1 pattern) ──────────────────
// These three products document the same /games + /standings shape as each
// other (team.id/name/logo, scores per period, standings with win/loss
// records). NOT yet run against a live key -- treat as a first draft.
async function syncStandingsGenericV1(league, client, sportLabel) {
  try {
    const res = await client.get('/standings', { params: { league: league.apiId, season: league.season } });
    const response = res.data?.response;
    if (!response?.length) { console.log(`[sync:${sportLabel}] No standings for ${league.name}`); return; }

    // Some of these APIs group standings (conference/division), some don't --
    // flatten defensively either way.
    const flat = Array.isArray(response[0]) ? response.flat() : response;

    await Standing.deleteMany({ league: league._id, season: league.season });
    const docs = flat.map((s, i) => ({
      league: league._id, season: league.season,
      rank: s.position ?? s.rank ?? i + 1,
      points: s.points?.for ?? s.points ?? 0,
      played: s.games?.played ?? s.played ?? 0,
      won: s.games?.win?.total ?? s.win?.total ?? s.won ?? 0,
      drawn: s.games?.draw?.total ?? s.draw ?? 0,
      lost: s.games?.lose?.total ?? s.lose?.total ?? s.lost ?? 0,
      goalsFor: s.points?.for ?? 0,
      goalsAgainst: s.points?.against ?? 0,
      goalDiff: (s.points?.for ?? 0) - (s.points?.against ?? 0),
      form: s.form || '',
      description: s.description || s.group?.name || '',
      team: { name: s.team?.name, logo: s.team?.logo, apiId: s.team?.id },
    })).filter(d => d.team.name); // drop anything we couldn't map a team name for

    if (docs.length) {
      await Standing.insertMany(docs);
      console.log(`[sync:${sportLabel}] Standings updated for ${league.name} (${docs.length} teams)`);
    } else {
      console.log(`[sync:${sportLabel}] Standings response for ${league.name} didn't match expected shape -- skipped. Inspect a raw response and adjust syncStandingsGenericV1().`);
    }
  } catch (err) {
    console.error(`[sync:${sportLabel}] Standings error for ${league.name}:`, err.message);
  }
}

async function syncFixturesGenericV1(league, client, sportLabel) {
  try {
    const [nextRes, lastRes] = await Promise.all([
      client.get('/games', { params: { league: league.apiId, season: league.season, next: 10 } }),
      client.get('/games', { params: { league: league.apiId, season: league.season, last: 10 } }),
    ]);
    const games = [...(nextRes.data?.response || []), ...(lastRes.data?.response || [])];

    for (const g of games) {
      const gameId = g.id ?? g.game?.id;
      const date = g.date ?? g.game?.date?.start;
      if (!gameId || !date) continue;

      const doc = {
        apiId: gameId, league: league._id, season: league.season, round: g.week ?? g.stage ?? '',
        date: new Date(date),
        status: {
          long: g.status?.long ?? '', short: g.status?.short ?? '', elapsed: g.status?.timer ?? null,
        },
        homeTeam: { name: g.teams?.home?.name, logo: g.teams?.home?.logo, apiId: g.teams?.home?.id },
        awayTeam: { name: g.teams?.away?.name, logo: g.teams?.away?.logo, apiId: g.teams?.away?.id },
        score: {
          home: g.scores?.home?.total ?? g.scores?.home ?? null,
          away: g.scores?.away?.total ?? g.scores?.away ?? null,
        },
        venue: g.venue?.name ?? g.venue ?? '',
      };
      if (!doc.homeTeam.name || !doc.awayTeam.name) continue; // shape mismatch, skip rather than write junk
      await Fixture.findOneAndUpdate({ apiId: gameId }, { $set: doc }, { upsert: true, new: true });
    }
    console.log(`[sync:${sportLabel}] Fixtures updated for ${league.name} (${games.length} games)`);
  } catch (err) {
    console.error(`[sync:${sportLabel}] Fixtures error for ${league.name}:`, err.message);
  }
}

// ── LIVE FIXTURES (football only, as before) ─────────────────────────────────
async function syncLiveFixtures() {
  try {
    const client = clientFor('football');
    const res = await client.get('/fixtures', { params: { live: 'all' } });
    const fixtures = res.data?.response || [];

    for (const f of fixtures) {
      await Fixture.findOneAndUpdate(
        { apiId: f.fixture.id },
        { $set: {
          'status.long': f.fixture.status.long,
          'status.short': f.fixture.status.short,
          'status.elapsed': f.fixture.status.elapsed,
          'score.home': f.goals.home,
          'score.away': f.goals.away,
          events: (f.events || []).map(e => ({
            minute: e.time.elapsed, type: e.type, detail: e.detail,
            team: e.team.name, player: e.player.name, assist: e.assist?.name || null,
          })),
        } },
        { upsert: false }
      );
    }
    if (fixtures.length > 0) console.log(`[sync] Live: updated ${fixtures.length} live fixtures`);
  } catch (err) {
    console.error('[sync] Live fixtures error:', err.message);
  }
}

// ── MAIN SYNC ─────────────────────────────────────────────────────────────────
// Routes each active, non-manual league to the right client/strategy by sport.
async function runSync() {
  if (!process.env.SPORTS_API_KEY) {
    console.log('[sync] SPORTS_API_KEY not set -- skipping sync');
    return;
  }

  console.log('[sync] Starting sports data sync...');
  const leagues = await League.find({ isActive: true, isManual: false });

  for (const league of leagues) {
    const clientKey = SPORT_CLIENT_KEY[league.sport];

    if (!clientKey) {
      // tennis / golf / boxing -- no API wired yet, see note at bottom of file
      console.log(`[sync] Skipping ${league.name} -- no API sync implemented for sport "${league.sport}" yet`);
      continue;
    }

    const client = clientFor(clientKey);
    try {
      if (clientKey === 'football') {
        await syncStandingsFootball(league, client);
        await syncFixturesFootball(league, client);
      } else {
        await syncStandingsGenericV1(league, client, clientKey);
        await syncFixturesGenericV1(league, client, clientKey);
      }
      await League.findByIdAndUpdate(league._id, { lastSynced: new Date() });
    } catch (err) {
      console.error(`[sync] Error syncing ${league.name} (${league.sport}):`, err.message);
    }
    // Small delay between leagues to respect free-tier rate limits
    await new Promise(r => setTimeout(r, 7000));
  }

  console.log('[sync] Sync complete');
}

// ── TENNIS / GOLF / BOXING ────────────────────────────────────────────────────
// Not wired up. api-sports.io doesn't cover these three at all -- Tennis and
// Golf are best done via BALLDONTLIE (balldontlie.io), Boxing has no good
// free option. More importantly: Tennis/Golf don't fit this file's
// team-vs-team Fixture/Standing shape at all -- Tennis standings are an ATP/
// WTA ranking list (not a league table), and Golf has no "fixture" concept,
// just a tournament leaderboard. Wiring these in needs a couple of new,
// differently-shaped models (e.g. PlayerRanking, TournamentLeaderboard)
// rather than forcing them through League/Fixture/Standing -- flagging this
// rather than hacking it in so the data model stays honest.

module.exports = { runSync, syncLiveFixtures };

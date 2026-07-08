// One-time seed: Premier League + Championship clubs for the 2026/27 season.
//
// Researched and verified against the actual final 2025/26 table and
// confirmed 2026/27 promotions/relegations (Wikipedia, ESPN, Premier
// League official) as of July 2026. Safe to re-run — teams are upserted
// by slug, so running this twice won't create duplicates.
//
// What this does for each team:
//   1. Creates (or finds) the Team document, with a logo path pulled from
//      your existing public/logos/teams library where available.
//   2. Adds it to that league's 2026 season roster (LeagueRoster) — this
//      is what makes it show up in the admin's season-aware Teams tab.
//   3. Since 2026 will be each league's *current* season once you bump
//      League.season, this also sets team.league so anything else in the
//      app that reads the legacy single-league field keeps working.
//
// Run: node seedTeams2026.js
require('dotenv').config();
const mongoose = require('mongoose');
const slugify = require('slugify');
const League = require('./models/League');
const Team = require('./models/Team');
const LeagueRoster = require('./models/LeagueRoster');

const SEASON = 2026;

// name -> logo path. Matched against your public/logos/teams folder
// listing. Three clubs currently have no logo file on disk (flagged
// below) — they're still seeded, just with an empty logo, so nothing
// blocks the import; add the SVGs and set the logo via the admin picker
// whenever you get them.
const LOGOS = {
  'Arsenal': '/logos/teams/arsenal.svg',
  'Manchester City': '/logos/teams/manchester-city.svg',
  'Manchester United': '/logos/teams/manchester-united.svg',
  'Aston Villa': '/logos/teams/aston-villa.svg',
  'Liverpool': '/logos/teams/liverpool.svg',
  'Bournemouth': '/logos/teams/bournemouth.svg',
  'Sunderland': '/logos/teams/sunderland.svg',
  'Brighton & Hove Albion': '/logos/teams/brighton.svg',
  'Brentford': '/logos/teams/brentford.svg',
  'Chelsea': '/logos/teams/chelsea.svg',
  'Fulham': '/logos/teams/fulham.svg',
  'Newcastle United': '/logos/teams/newcastle.svg',
  'Everton': '/logos/teams/everton.svg',
  'Leeds United': '/logos/teams/leeds-united.svg',
  'Crystal Palace': '/logos/teams/crystal-palace.svg',
  'Nottingham Forest': '/logos/teams/nottingham-forest.svg',
  'Tottenham Hotspur': '/logos/teams/tottenham.svg',
  'Coventry City': '/logos/teams/coventry-city.svg',
  'Ipswich Town': '/logos/teams/ipswich.svg',
  'Hull City': '/logos/teams/hull-city.svg',

  'Wolverhampton Wanderers': '/logos/teams/wolves.svg',
  'Blackburn Rovers': '/logos/teams/blackburn-rovers.svg',
  'Bolton Wanderers': null, // NOT in your logo library yet
  'Preston North End': '/logos/teams/preston-north-end.svg',
  'Bristol City': '/logos/teams/bristol-city.svg',
  'Millwall': '/logos/teams/millwall.svg',
  'Charlton Athletic': '/logos/teams/charlton.svg',
  'Derby County': '/logos/teams/derby-county.svg',
  'Middlesbrough': '/logos/teams/middlesbrough.svg',
  'Lincoln City': null, // NOT in your logo library — "lincoln-red-imps.svg" is a different club (Gibraltar), don't reuse it
  'Norwich City': '/logos/teams/norwich-city.svg',
  'West Bromwich Albion': '/logos/teams/west-bromwich-albion.svg',
  'Portsmouth': '/logos/teams/portsmouth.svg',
  'Queens Park Rangers': '/logos/teams/queens-park-rangers.svg',
  'Sheffield United': '/logos/teams/sheffield-united.svg',
  'Birmingham City': '/logos/teams/birmingham.svg',
  'Stoke City': '/logos/teams/stoke-city.svg',
  'Swansea City': '/logos/teams/swansea-city.svg',
  'Burnley': '/logos/teams/burnley.svg',
  'West Ham United': '/logos/teams/west-ham.svg',
  'Watford': '/logos/teams/watford.svg',
  'Southampton': '/logos/teams/southampton.svg',
  'Cardiff City': null, // NOT in your logo library yet
  'Wrexham': '/logos/teams/wrexham.svg',
};

const LEAGUES = {
  'premier-league': [
    'Arsenal', 'Manchester City', 'Manchester United', 'Aston Villa', 'Liverpool',
    'Bournemouth', 'Sunderland', 'Brighton & Hove Albion', 'Brentford', 'Chelsea',
    'Fulham', 'Newcastle United', 'Everton', 'Leeds United', 'Crystal Palace',
    'Nottingham Forest', 'Tottenham Hotspur', 'Coventry City', 'Ipswich Town', 'Hull City',
  ],
  'championship': [
    'Wolverhampton Wanderers', 'Blackburn Rovers', 'Bolton Wanderers', 'Preston North End',
    'Bristol City', 'Millwall', 'Charlton Athletic', 'Derby County', 'Middlesbrough',
    'Lincoln City', 'Norwich City', 'West Bromwich Albion', 'Portsmouth', 'Queens Park Rangers',
    'Sheffield United', 'Birmingham City', 'Stoke City', 'Swansea City', 'Burnley',
    'West Ham United', 'Watford', 'Southampton', 'Cardiff City', 'Wrexham',
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let teamsCreated = 0, teamsFound = 0, rosterAdded = 0, missingLogos = [];

  for (const [leagueSlug, teamNames] of Object.entries(LEAGUES)) {
    const league = await League.findOne({ slug: leagueSlug });
    if (!league) { console.log(`  ! League not found: ${leagueSlug} — skipping`); continue; }

    console.log(`\n${league.name}:`);
    for (const name of teamNames) {
      const slug = slugify(name, { lower: true, strict: true });
      const logo = LOGOS[name];
      if (!logo) missingLogos.push(name);

      let team = await Team.findOne({ slug });
      if (!team) {
        team = await Team.create({
          name, slug, sport: 'football', logo: logo || '', isManual: true,
        });
        teamsCreated++;
        console.log(`  + created: ${name}`);
      } else {
        teamsFound++;
        console.log(`  = exists: ${name}`);
      }

      const rosterEntry = await LeagueRoster.findOneAndUpdate(
        { league: league._id, season: SEASON, team: team._id },
        { league: league._id, season: SEASON, team: team._id },
        { upsert: true, new: true }
      );
      if (rosterEntry) rosterAdded++;

      // This is the league's current season — keep the legacy pointer synced.
      if (league.season === SEASON) {
        team.league = league._id;
        await team.save();
      }
    }
  }

  console.log(`\nDone — ${teamsCreated} teams created, ${teamsFound} already existed, ${rosterAdded} roster entries set for season ${SEASON}.`);
  if (missingLogos.length) {
    console.log(`\nNo logo file found for these ${missingLogos.length} clubs (seeded with an empty logo — add the SVG then set it via the admin picker):`);
    missingLogos.forEach(n => console.log(`  - ${n}`));
  }
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});

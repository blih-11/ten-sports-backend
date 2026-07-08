// Round 2 seed: League One, League Two, La Liga, Serie A, Bundesliga, and
// Ligue 1 clubs for the 2026/27 season.
//
// Researched and verified against current (July 2026) Wikipedia season
// pages for each competition — i.e. actual confirmed promotion/relegation
// outcomes from the just-finished 2025/26 season, not guesses. Safe to
// re-run: teams are upserted by slug, so running this twice won't create
// duplicates.
//
// NOTE ON LOGOS: unlike seedTeams2026.js (Premier League/Championship),
// this script does NOT have visibility into your public/logos/teams
// folder for these six leagues, so every logo path below is a *guessed*
// slug-based path (e.g. /logos/teams/barcelona.svg) that may or may not
// exist on disk yet. Teams are seeded with these guessed paths; any that
// don't resolve will just show a broken image until you add the SVG or
// fix the path via the admin picker. This is different from the Round 1
// script, which had verified real filenames.
//
// Run: node seedTeams2026Round2.js
require('dotenv').config();
const mongoose = require('mongoose');
const slugify = require('slugify');
const League = require('./models/League');
const Team = require('./models/Team');
const LeagueRoster = require('./models/LeagueRoster');

const SEASON = 2026;

const LEAGUES = {
  'league-one': [
    'AFC Wimbledon', 'Barnsley', 'Blackpool', 'Bradford City', 'Bromley', 'Burton Albion',
    'Cambridge United', 'Doncaster Rovers', 'Huddersfield Town', 'Leicester City',
    'Leyton Orient', 'Luton Town', 'Mansfield Town', 'Milton Keynes Dons', 'Notts County',
    'Oxford United', 'Peterborough United', 'Plymouth Argyle', 'Reading',
    'Sheffield Wednesday', 'Stevenage', 'Stockport County', 'Wigan Athletic',
    'Wycombe Wanderers',
  ],
  'league-two': [
    'Accrington Stanley', 'Barnet', 'Bristol Rovers', 'Cheltenham Town', 'Chesterfield',
    'Colchester United', 'Crawley Town', 'Crewe Alexandra', 'Exeter City', 'Fleetwood Town',
    'Gillingham', 'Grimsby Town', 'Newport County', 'Northampton Town', 'Oldham Athletic',
    'Port Vale', 'Rochdale', 'Rotherham United', 'Salford City', 'Shrewsbury Town',
    'Swindon Town', 'Tranmere Rovers', 'Walsall', 'York City',
  ],
  'la-liga': [
    'Alavés', 'Athletic Bilbao', 'Atlético Madrid', 'Barcelona', 'Celta Vigo',
    'Deportivo La Coruña', 'Elche', 'Espanyol', 'Getafe', 'Levante', 'Málaga', 'Osasuna',
    'Racing Santander', 'Rayo Vallecano', 'Real Betis', 'Real Madrid', 'Real Sociedad',
    'Sevilla', 'Valencia', 'Villarreal',
  ],
  'serie-a': [
    'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Fiorentina', 'Frosinone', 'Genoa',
    'Inter Milan', 'Juventus', 'Lazio', 'Lecce', 'AC Milan', 'Monza', 'Napoli', 'Parma',
    'Roma', 'Sassuolo', 'Torino', 'Udinese', 'Venezia',
  ],
  'bundesliga': [
    'Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig',
    'Eintracht Frankfurt', 'VfB Stuttgart', 'Borussia Mönchengladbach', 'SC Freiburg',
    'Mainz 05', 'Werder Bremen', 'Union Berlin', '1. FC Köln', 'TSG Hoffenheim',
    'FC Augsburg', 'Hamburger SV', 'SV Elversberg', 'Schalke 04', 'SC Paderborn',
  ],
  'ligue-1': [
    'Paris Saint-Germain', 'Marseille', 'Monaco', 'Lille', 'Lyon', 'Nice', 'Lens', 'Rennes',
    'Strasbourg', 'Toulouse', 'Auxerre', 'Angers', 'Le Havre', 'Brest', 'Lorient',
    'Paris FC', 'Troyes', 'Le Mans',
  ],
};

// Guessed logo path for every team, following the same
// /logos/teams/<slug>.svg convention as your existing library. These are
// NOT verified against your actual public/logos/teams folder (unlike
// Round 1) — treat as placeholders to fix up via the admin picker.
function guessLogo(name) {
  const slug = slugify(name, { lower: true, strict: true });
  return `/logos/teams/${slug}.svg`;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let teamsCreated = 0, teamsFound = 0, rosterAdded = 0, leaguesSkipped = [];

  for (const [leagueSlug, teamNames] of Object.entries(LEAGUES)) {
    const league = await League.findOne({ slug: leagueSlug });
    if (!league) {
      console.log(`  ! League not found: ${leagueSlug} — skipping (run seedLeagues.js first)`);
      leaguesSkipped.push(leagueSlug);
      continue;
    }

    console.log(`\n${league.name}:`);
    for (const name of teamNames) {
      const slug = slugify(name, { lower: true, strict: true });
      let team = await Team.findOne({ slug });
      if (!team) {
        team = await Team.create({
          name, slug, sport: 'football', logo: guessLogo(name), isManual: true,
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

      if (league.season === SEASON) {
        team.league = league._id;
        await team.save();
      }
    }
  }

  console.log(`\nDone — ${teamsCreated} teams created, ${teamsFound} already existed, ${rosterAdded} roster entries set for season ${SEASON}.`);
  if (leaguesSkipped.length) {
    console.log(`\nSkipped leagues (not found in DB): ${leaguesSkipped.join(', ')}`);
  }
  console.log(`\nReminder: all logo paths in this script are guessed slugs, not verified filenames. Check public/logos/teams and fix any broken images via the admin picker.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
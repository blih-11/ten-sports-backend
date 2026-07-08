const League = require('../models/League');
const { runSync } = require('../jobs/sportsSync');
const slugify = require('slugify');

exports.getLeagues = async (req, res, next) => {
  try {
    const { sport, active } = req.query;
    const query = {};
    if (sport) query.sport = sport;
    if (active !== undefined) query.isActive = active === 'true';

    const leagues = await League.find(query).sort({ sport: 1, name: 1 });
    res.json({ success: true, count: leagues.length, data: leagues });
  } catch (err) { next(err); }
};

exports.getLeague = async (req, res, next) => {
  try {
    const league = await League.findOne({ slug: req.params.slug });
    if (!league) return res.status(404).json({ success: false, message: 'League not found' });
    res.json({ success: true, data: league });
  } catch (err) { next(err); }
};

exports.createLeague = async (req, res, next) => {
  try {
    const { name, country, sport, apiId, season, isManual, logo } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const league = await League.create({ name, slug, country, sport, apiId, season, isManual, logo });
    res.status(201).json({ success: true, data: league });
  } catch (err) { next(err); }
};

exports.updateLeague = async (req, res, next) => {
  try {
    const league = await League.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!league) return res.status(404).json({ success: false, message: 'League not found' });
    res.json({ success: true, data: league });
  } catch (err) { next(err); }
};

exports.deleteLeague = async (req, res, next) => {
  try {
    const league = await League.findByIdAndDelete(req.params.id);
    if (!league) return res.status(404).json({ success: false, message: 'League not found' });
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};

// Manual trigger for admin — syncs one specific league immediately
exports.syncLeague = async (req, res, next) => {
  try {
    const { syncStandings, syncFixtures } = require('../jobs/sportsSync');
    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ success: false, message: 'League not found' });
    if (league.isManual) return res.status(400).json({ success: false, message: 'This league uses manual entry' });

    res.json({ success: true, message: 'Sync started in background' });
    // Run after response is sent so client doesn't wait
    setImmediate(async () => {
      const { syncStandings, syncFixtures } = require('../jobs/sportsSync');
      await syncStandings(league);
      await syncFixtures(league);
    });
  } catch (err) { next(err); }
};

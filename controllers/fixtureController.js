const Fixture = require('../models/Fixture');
const League = require('../models/League');
const Team = require('../models/Team');

exports.getFixtures = async (req, res, next) => {
  try {
    const { leagueSlug, leagueId, status, date, limit = 20, page = 1, team } = req.query;
    const query = {};

    if (leagueSlug) {
      const league = await League.findOne({ slug: leagueSlug });
      if (league) query.league = league._id;
    } else if (leagueId) {
      query.league = leagueId;
    }

    // Filter to fixtures where the given team (by slug) played, on either side
    if (team) {
      const teamDoc = await Team.findOne({ slug: team });
      if (teamDoc) {
        query.$or = [
          { 'homeTeam.ref': teamDoc._id },
          { 'awayTeam.ref': teamDoc._id },
        ];
      } else {
        // Unknown team slug — return no results rather than the unfiltered list
        query._id = null;
      }
    }

    if (status) {
      if (status === 'live') {
        query['status.short'] = { $in: ['1H', '2H', 'HT', 'ET', 'P'] };
      } else if (status === 'finished') {
        query['status.short'] = 'FT';
      } else if (status === 'upcoming') {
        query['status.short'] = 'NS';
        query.date = { $gte: new Date() };
      }
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Fixture.countDocuments(query);
    const fixtures = await Fixture.find(query)
      .populate('league', 'name logo slug')
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: fixtures.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      data: fixtures,
    });
  } catch (err) { next(err); }
};

exports.getFixture = async (req, res, next) => {
  try {
    const fixture = await Fixture.findById(req.params.id).populate('league', 'name logo slug');
    if (!fixture) return res.status(404).json({ success: false, message: 'Fixture not found' });
    res.json({ success: true, data: fixture });
  } catch (err) { next(err); }
};

// Today's fixtures across all active leagues
exports.getTodaysFixtures = async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const fixtures = await Fixture.find({ date: { $gte: start, $lte: end } })
      .populate('league', 'name logo slug')
      .sort({ date: 1 })
      .limit(50);

    res.json({ success: true, count: fixtures.length, data: fixtures });
  } catch (err) { next(err); }
};

// Manual fixture creation for manually-managed leagues
exports.createFixture = async (req, res, next) => {
  try {
    const fixture = await Fixture.create({ ...req.body, isManual: true });
    res.status(201).json({ success: true, data: fixture });
  } catch (err) { next(err); }
};

exports.updateFixture = async (req, res, next) => {
  try {
    const fixture = await Fixture.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!fixture) return res.status(404).json({ success: false, message: 'Fixture not found' });
    res.json({ success: true, data: fixture });
  } catch (err) { next(err); }
};
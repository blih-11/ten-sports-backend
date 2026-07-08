const Team = require('../models/Team');
const slugify = require('slugify');

exports.getTeams = async (req, res, next) => {
  try {
    const { league, sport } = req.query;
    const query = {};
    if (league) query.league = league;
    if (sport) query.sport = sport;
    const teams = await Team.find(query).populate('league', 'name slug').sort('name');
    res.json({ success: true, count: teams.length, data: teams });
  } catch (err) { next(err); }
};

exports.getTeam = async (req, res, next) => {
  try {
    const team = await Team.findOne({ slug: req.params.slug }).populate('league', 'name slug logo');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
};

exports.createTeam = async (req, res, next) => {
  try {
    const slug = slugify(req.body.name, { lower: true, strict: true });
    const team = await Team.create({ ...req.body, slug });
    res.status(201).json({ success: true, data: team });
  } catch (err) { next(err); }
};

exports.updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
};

exports.deleteTeam = async (req, res, next) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};

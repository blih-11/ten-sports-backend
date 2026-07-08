const Player = require('../models/Player');
const slugify = require('slugify');

exports.getPlayers = async (req, res, next) => {
  try {
    const { team, sport, search, limit = 20, page = 1 } = req.query;
    const query = {};
    if (team) query.team = team;
    if (sport) query.sport = sport;
    if (search) query.name = { $regex: search, $options: 'i' };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Player.countDocuments(query);
    const players = await Player.find(query).populate('team', 'name logo slug').sort('name').skip(skip).limit(parseInt(limit));
    res.json({ success: true, count: players.length, total, pages: Math.ceil(total / parseInt(limit)), data: players });
  } catch (err) { next(err); }
};

exports.getPlayer = async (req, res, next) => {
  try {
    const player = await Player.findOne({ slug: req.params.slug }).populate('team', 'name logo slug');
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, data: player });
  } catch (err) { next(err); }
};

exports.createPlayer = async (req, res, next) => {
  try {
    const slug = slugify(req.body.name, { lower: true, strict: true });
    const player = await Player.create({ ...req.body, slug });
    res.status(201).json({ success: true, data: player });
  } catch (err) { next(err); }
};

exports.updatePlayer = async (req, res, next) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, data: player });
  } catch (err) { next(err); }
};

exports.deletePlayer = async (req, res, next) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: {} });
  } catch (err) { next(err); }
};

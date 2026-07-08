const Standing = require('../models/Standing');
const League = require('../models/League');

exports.getStandings = async (req, res, next) => {
  try {
    const { leagueSlug, leagueId, season } = req.query;

    let leagueDoc = null;
    if (leagueSlug) leagueDoc = await League.findOne({ slug: leagueSlug });
    else if (leagueId) leagueDoc = await League.findById(leagueId);

    if (!leagueDoc) return res.status(404).json({ success: false, message: 'League not found' });

    const targetSeason = parseInt(season) || leagueDoc.season;
    const standings = await Standing.find({ league: leagueDoc._id, season: targetSeason }).sort('rank');

    res.json({
      success: true,
      league: { name: leagueDoc.name, logo: leagueDoc.logo, slug: leagueDoc.slug },
      season: targetSeason,
      lastSynced: leagueDoc.lastSynced,
      data: standings,
    });
  } catch (err) { next(err); }
};

// For manually managed leagues — update a single team's standing entry
exports.updateStanding = async (req, res, next) => {
  try {
    const standing = await Standing.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!standing) return res.status(404).json({ success: false, message: 'Standing not found' });
    res.json({ success: true, data: standing });
  } catch (err) { next(err); }
};

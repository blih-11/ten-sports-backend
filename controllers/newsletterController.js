const Subscriber = require('../models/Subscriber');
const nodemailer = require('nodemailer');

exports.subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      if (existing.isActive) return res.status(400).json({ success: false, message: 'Email already subscribed' });
      existing.isActive = true;
      await existing.save();
      return res.json({ success: true, message: 'Welcome back! You are now resubscribed.' });
    }
    await Subscriber.create({ email });
    res.status(201).json({ success: true, message: 'Successfully subscribed to Ten Sports newsletter!' });
  } catch (error) { next(error); }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    await Subscriber.findOneAndUpdate({ email }, { isActive: false });
    res.json({ success: true, message: 'You have been unsubscribed.' });
  } catch (error) { next(error); }
};

exports.getSubscribers = async (req, res, next) => {
  try {
    const subscribers = await Subscriber.find({ isActive: true }).sort({ subscribedAt: -1 });
    res.json({ success: true, count: subscribers.length, data: subscribers });
  } catch (error) { next(error); }
};

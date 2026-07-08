require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await User.findOne({ email: 'admin@tensports.com' });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      return process.exit(0);
    }

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@tensports.com',
      password: 'Admin123', // plain text here — the pre-save hook hashes it
      role: 'admin'
    });

    console.log('Admin created:', admin.email, '/ password: Admin123');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

createAdmin();
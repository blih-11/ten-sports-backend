// Run with: node resetAdminPassword.js "admin@tensports.com" "NewPassword123"
// Finds the user, sets a new password, and saves — this goes through the
// pre('save') hook in User.js so it gets hashed exactly the way login expects.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const [, , inputEmail, newPassword] = process.argv;

if (!inputEmail || !newPassword) {
  console.log('Usage: node resetAdminPassword.js "email" "newPassword"');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = inputEmail.trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`No user found with email "${email}". Nothing to reset.`);
      process.exit(1);
    }

    user.password = newPassword; // pre('save') hook hashes this on .save()
    await user.save();

    console.log(`Password reset for ${user.email}. New password: ${newPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();

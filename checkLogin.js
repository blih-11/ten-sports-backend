// Run with: node checkLogin.js "the-exact-email" "the-exact-password"
// This bypasses Express/CORS/the frontend entirely and talks straight to Mongo,
// so it isolates whether the bug is in the DB data or somewhere in the HTTP layer.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const [, , inputEmail, inputPassword] = process.argv;

if (!inputEmail || !inputPassword) {
  console.log('Usage: node checkLogin.js "email" "password"');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, lowercase: true },
  password: { type: String, select: false },
  role: String,
  isActive: Boolean,
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- Connected to:', mongoose.connection.name, '---\n');

    // 1. List every user in the collection, raw, so we can see exact stored values
    const allUsers = await User.find().select('+password');
    console.log(`Total users in DB: ${allUsers.length}`);
    allUsers.forEach((u, i) => {
      console.log(`  [${i}] email="${u.email}" (len=${u.email.length}) role=${u.role} isActive=${u.isActive} hashPrefix=${u.password ? u.password.slice(0, 7) : 'MISSING'}`);
    });
    console.log();

    // 2. Try the exact lookup the login route does (case-insensitive, trimmed)
    const normalizedEmail = inputEmail.trim().toLowerCase();
    console.log(`Looking up email="${normalizedEmail}" (from input "${inputEmail}")`);
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.log('\n RESULT: No user found with that email after normalization.');
      console.log('   -> Compare this against the raw emails listed above for typos/extra characters.');
      process.exit(0);
    }

    console.log(`Found user: ${user.email}, isActive=${user.isActive}`);
    if (!user.password) {
      console.log('\n RESULT: User found but has NO password hash stored (select: false misconfigured, or field never set).');
      process.exit(0);
    }

    console.log(`Stored hash: ${user.password}`);
    console.log(`Hash looks like valid bcrypt: ${/^\$2[aby]\$\d{2}\$.{53}$/.test(user.password)}`);

    const inputTrimmed = inputPassword.trim();
    const matchRaw = await bcrypt.compare(inputPassword, user.password);
    const matchTrimmed = await bcrypt.compare(inputTrimmed, user.password);

    console.log(`\nbcrypt.compare(raw input password, stored hash) = ${matchRaw}`);
    console.log(`bcrypt.compare(trimmed input password, stored hash) = ${matchTrimmed}`);

    if (matchRaw || matchTrimmed) {
      console.log('\n RESULT: Password DOES match at the database level.');
      console.log('   -> The bug is NOT in Mongo/bcrypt. It is in the HTTP layer:');
      console.log('      check that req.body actually contains {email, password} as sent');
      console.log('      (e.g. log req.body as the very first line of login(), before destructuring),');
      console.log('      and that the frontend is sending JSON with Content-Type: application/json.');
    } else {
      console.log('\n RESULT: Password does NOT match this hash.');
      console.log('   -> Either you are typing the wrong password, or the hash in the DB');
      console.log('      was set with a different password than you think (re-run seedAdmin');
      console.log('      after deleting this user, or use the reset snippet below).');
    }

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();

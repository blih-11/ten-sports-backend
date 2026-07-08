require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { runSync, syncLiveFixtures } = require('./jobs/sportsSync');

// Connect to database
connectDB();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/', limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/articles',  require('./routes/articles'));
app.use('/api/categories',require('./routes/categories'));
app.use('/api/page-sections', require('./routes/pageSections'));
app.use('/api/nav-items', require('./routes/navItems'));
app.use('/api/sports-data', require('./routes/dataReset'));
app.use('/api/newsletter',require('./routes/newsletter'));
app.use('/api/upload',    require('./routes/upload'));
// Sports data routes
app.use('/api/leagues',   require('./routes/leagues'));
app.use('/api/standings', require('./routes/standings'));
app.use('/api/fixtures',  require('./routes/fixtures'));
app.use('/api/teams',     require('./routes/teams'));
app.use('/api/players',   require('./routes/players'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Ten Sports API is running', status: 'ok' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// ── Cron jobs ─────────────────────────────────────────────────────────────────
// Full sync: standings + next/last fixtures — every day at 5am
cron.schedule('0 5 * * *', () => {
  console.log('[cron] Running daily sports sync...');
  runSync();
});

// Live scores: every 2 minutes during typical match hours (12pm–11pm)
cron.schedule('*/2 12-23 * * *', () => {
  syncLiveFixtures();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Ten Sports API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

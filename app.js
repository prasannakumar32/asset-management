require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const db = require('./backend/models');
const bcrypt = require('bcryptjs');
const path = require('path');
const methodOverride = require('method-override');

// Production session store
let sessionStore;
if (process.env.NODE_ENV === 'production') {
  const pgSession = require('connect-pg-simple')(session);
  sessionStore = new pgSession({
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    tableName: 'user_sessions',
    // auto-create the sessions table if it doesn't exist (prevents "relation does not exist")
    createTableIfMissing: true
  });
} else {
  sessionStore = new session.MemoryStore();
}

// Connect to DB with retry logic
const connectDB = async (retries = 5, delay = 5000) => {
  try {
    console.log('Attempting database connection...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Database URL exists:', !!process.env.DATABASE_URL);
    
    if (process.env.DATABASE_URL) {
      console.log('DATABASE_URL found, length:', process.env.DATABASE_URL.length);
    }
    
    // Debug: Show all database-related environment variables
    console.log('=== Database Environment Variables ===');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
      console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
      console.log('DATABASE_URL (first 50 chars):', process.env.DATABASE_URL.substring(0, 50) + '...');
      console.log('DATABASE_URL format check:', process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'));
    }
    console.log('PGHOST:', process.env.PGHOST);
    console.log('PGPORT:', process.env.PGPORT);
    console.log('PGUSER:', process.env.PGUSER);
    console.log('PGDATABASE:', process.env.PGDATABASE);
    console.log('PGPASSWORD exists:', !!process.env.PGPASSWORD);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_PASSWORD exists:', !!process.env.DB_PASSWORD);
    console.log('=========================================');
    
    await db.sequelize.authenticate();
    console.log('Database connected successfully');
    await db.sequelize.sync();

    // Ensure session table exists for connect-pg-simple (safety fallback)
    try {
      const [rows] = await db.sequelize.query("SELECT to_regclass('public.user_sessions') AS exists;");
      const exists = rows && rows[0] && rows[0].exists;
      if (!exists) {
        console.log('`user_sessions` table missing — creating fallback table');
        await db.sequelize.query(`
          CREATE TABLE IF NOT EXISTS "user_sessions" (
            sid varchar NOT NULL PRIMARY KEY,
            sess json NOT NULL,
            expire timestamp(6) NOT NULL
          );
        `);
        console.log('`user_sessions` table created (or already exists)');
      }
    } catch (err) {
      console.warn('Could not ensure `user_sessions` table exists:', err.message);
    }

    // Create admin user if not exists
    await createAdminUser();

    // Optional: run seed scripts in production when RUN_SEEDS=true
    if (process.env.RUN_SEEDS === 'true') {
      const seedTarget = (process.env.SEED_TARGET || 'sample').toLowerCase();
      console.log('RUN_SEEDS detected — seeding target:', seedTarget);
      try {
        if (seedTarget === 'admin' || seedTarget === 'all' || seedTarget === 'sample') {
          const createAdmin = require('./scripts/seed-admin');
          await createAdmin(false);
        }
        if (seedTarget === 'sample' || seedTarget === 'all') {
          const seedSample = require('./scripts/seed-sample-data');
          await seedSample(false);
        }
        if (seedTarget === 'assets') {
          const seedAssetsOnly = require('./scripts/seed-assets-only');
          await seedAssetsOnly(false);
        }
        console.log('Seeding (RUN_SEEDS) completed');
      } catch (err) {
        console.error('Seeding failed (RUN_SEEDS):', err);
      }
    }
  } catch (error) {
    console.error(`Database connection failed (attempt ${6 - retries}/5):`, error.message);
    
    if (retries > 0) {
      console.log(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retries - 1, delay);
    }
    
    console.error('Max retries reached. Full error:', error);
    process.exit(1);
  }
};

// Create admin user function
const createAdminUser = async () => {
  try {
    const existingAdmin = await db.User.findOne({ 
      where: { username: 'admin' } 
    });

    if (!existingAdmin) {
      await db.User.create({
        username: 'admin',
        email: 'admin@assettracker.com',
        password: 'admin123',
        role: 'admin',
        is_active: true
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Initialize session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    name: 'asset-tracker.sid' // Custom session name for security
  })
);

// Trust proxy for production (Render/Heroku)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.message = req.session.message;
  // Clear message after it's been made available to views
  if (req.session.message) {
    delete req.session.message;
  }
  next();
});

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Set JADE as view engine
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'style')));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

// Enable CORS for local API calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});


// Passport middleware
// Configure Passport
require('./backend/config/passport')(passport);

// API routes
const assetRoutes = require('./backend/asset/assetRoute');
app.use('/api/assets', assetRoutes);
// AssetAssignment routes
const assetAssignmentRoutes = require('./backend/assetAssignment/assetAssignmentRoute');
app.use('/api/asset-assignment', assetAssignmentRoutes);
// AssetCategories routes
const assetCategoriesRoutes = require('./backend/assetCategories/assetCategoryRoute');
app.use('/api/asset-categories', assetCategoriesRoutes);
// AssetHistory routes
const assetHistoryRoutes = require('./backend/assetHistory/assetHistoryRoute');
app.use('/api/asset-history', assetHistoryRoutes);
// Employee routes
const employeeRoutes = require('./backend/employee/employeeRoute');
app.use('/api/employee', employeeRoutes);

// Dashboard API route
const dashboardController = require('./backend/dashboard/dashboardController');
app.get('/api/dashboard', dashboardController.getDashboardData);

// Stock API route
const stockRoutes = require('./backend/stock/stockRoute');
app.use('/api/stock', stockRoutes);

// Health check endpoint (includes DB connectivity)
app.get('/health', async (req, res) => {
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };

  try {
    await db.sequelize.authenticate();
    payload.database = 'connected';
    return res.status(200).json(payload);
  } catch (err) {
    payload.database = 'unreachable';
    payload.error = err.message;
    return res.status(503).json(payload);
  }
});

// Main routes (should be after API routes)
const mainRoutes = require('./backend/routes');
app.use('/', mainRoutes);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  // Optional: run seed scripts in controlled way when requested via env vars
  if (process.env.RUN_SEEDS === 'true') {
    const warnMsg = 'RUN_SEEDS is enabled. This will run seed scripts against the connected database.';
    console.warn(warnMsg);

    // In production require explicit confirmation env var
    if (process.env.NODE_ENV === 'production' && process.env.RUN_SEEDS_CONFIRM !== 'yes') {
      console.warn('Skipping RUN_SEEDS in production because RUN_SEEDS_CONFIRM !== "yes". Set RUN_SEEDS_CONFIRM=yes to proceed.');
    } else {
      try {
        console.log('Executing seed scripts (admin, sample, assets)');
        const seedAdmin = require('./scripts/seed-admin');
        const seedSampleData = require('./scripts/seed-sample-data');
        const seedAssetsOnly = require('./scripts/seed-assets-only');

        // run without closing the existing Sequelize connection (closeAfter=false)
        await seedAdmin(false);
        await seedSampleData(false);
        await seedAssetsOnly(false);
        console.log('RUN_SEEDS: seed scripts completed');
      } catch (err) {
        console.error('RUN_SEEDS error:', err);
      }
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};
startServer().catch(console.error);
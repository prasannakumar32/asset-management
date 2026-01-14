require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const db = require('./backend/models');
const bcrypt = require('bcryptjs');
const path = require('path');
const methodOverride = require('method-override');

//check database connection
const connectDB = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected successfully');
    await db.sequelize.sync();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Make user available to views
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
app.use('/asset-assignment', assetAssignmentRoutes);
// AssetCategories routes
const assetCategoriesRoutes = require('./backend/assetCategories/assetCategoryRoute');
app.use('/api/asset-categories', assetCategoriesRoutes);
// AssetHistory routes
const assetHistoryRoutes = require('./backend/assetHistory/assetHistoryRoute');
app.use('/asset-history', assetHistoryRoutes);
// Employee routes
const employeeRoutes = require('./backend/employee/employeeRoute');
app.use('/api/employee', employeeRoutes);

// Dashboard API route
const dashboardController = require('./backend/dashboard/dashboardController');
app.get('/api/dashboard', dashboardController.getDashboardData);

// Stock API route
const stockRoutes = require('./backend/stock/stockRoute');
app.use('/api/stock', stockRoutes);

// Main routes (should be after API routes)
const mainRoutes = require('./backend/routes');
app.use('/', mainRoutes);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};
startServer().catch(console.error);
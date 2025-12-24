require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const db = require('./backend/models');
const bcrypt=require('bcryptjs');
const path = require('path');



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

//set up session
app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false
  })
)


// 🔑 Set JADE as view engine
app.set('view engine', 'jade');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'style')));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Enable CORS for local API calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});


// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
require('./backend/config/passport')(passport);

// API routes
const assetRoutes = require('./backend/asset/assetRoute');
app.use('/api/assets', assetRoutes);
// Employee routes
const employeeRoutes = require('./backend/employee/employeeRoute');
app.use('/api/employee', employeeRoutes);
// AssetAssignment routes
const assetAssignmentRoutes = require('./backend/assetAssignment/assetAssignmentRoute');
app.use('/api/asset-assignment', assetAssignmentRoutes);
// AssetCategories routes
const assetCategoriesRoutes = require('./backend/assetCategories/assetCategoryRoute');
app.use('/api/asset-categories', assetCategoriesRoutes);
// AssetHistory routes
const assetHistoryRoutes = require('./backend/assetHistory/assetHistoryRoute');
app.use('/api/asset-history', assetHistoryRoutes);

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
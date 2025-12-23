require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const db = require('./backend/models');
const bcrypt=require('bcryptjs');



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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
require('./backend/config/passport')(passport);


// Routes
const mainRoutes = require('./backend/routes');
app.use('/', mainRoutes);
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
// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch(console.error);
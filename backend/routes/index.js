const express = require('express');
const router = express.Router();
const passport = require('passport');
const assets = require('../asset/assetRoute');
const employees = require('../employee/employeeRoute');
const assetCategories = require('../assetCategories/assetCategoryRoute');
const assetAssignments = require('../assetAssignment/assetAssignmentRoute');
const assetHistory = require('../assetHistory/assetHistoryRoute');
const stock = require('../stock/stockRoute');

// Assets page
router.get('/assets', require('../asset/assetController').list);

//create asset and edit assert 
router.get('/assets/form', require('../asset/assetController').showAssetForm);
router.get('/assets/:id/form', require('../asset/assetController').showAssetForm);

// Get single asset (view page)
router.get('/assets/:id' , require('../asset/assetController').viewAsset);

// Create Asset 
router.post('/assets' , require('../asset/assetController').create);

// Update asset
router.put('/assets/:id' , require('../asset/assetController').update);

// Delete asset
router.delete('/assets/:id' , require('../asset/assetController').delete);
router.post('/assets/:id/delete', (req, res) => {
  require('../asset/assetController').delete(req, res);
});

// Employees page
router.get('/employee' , (req, res) => {
  res.render('employee/employee');
});

// Asset Assignment page
router.get('/asset-assignment' , (req, res) => {
  res.render('asset-assignment/asset-assignment');
});

// Asset Assignment Issue Form page
router.get('/asset-assignment/issue' , (req, res) => {
  res.render('asset-assignment/issue-form');
});

// Asset Assignment Return Form page
router.get('/asset-assignment/return' , require('../assetAssignment/assetAssignmentController').showReturnForm);

// Asset Scrap Form page
router.get('/asset-assignment/scrap' , require('../assetAssignment/assetAssignmentController').showScrapForm);

// Asset Categories page
router.get('/asset-categories' , (req, res) => {
  res.render('asset-categories/asset-categories');
});

// API routes are handled in app.js, no need to duplicate here
// Login page (JADE)
router.get('/login', (req, res) => {
  res.render('login');
});
// Logout
router.get('/logout', (req, res) => { 
  req.logout(() => {
    res.redirect('/login');
  });
});
// Form login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { 
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: false
  })(req, res, next);
});
// API login
router.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    req.logIn(user, err => {
      if (err) return res.status(500).json({ error: 'Login failed' });
      res.json({
        success: true,
        user: { id: user.id, username: user.username }
      });
    });
  })(req, res, next);
});

const db = require('../models');

const statusColors = {
  'assigned': 'blue',
  'returned': 'green',
  'under_maintenance': 'yellow',
  'lost': 'red',
  'damaged': 'grey'
};

router.get('/dashboard' , async (req, res) => {
  try {
    
    const allAssets = await db.Asset.findAll();
    const allEmployees = await db.Employee.findAll();
    const allAssignments = await db.AssetAssignment.findAll();
    
    const assets = await db.Asset.findAll({ where: { is_active: true } });
    const employees = await db.Employee.findAll({ where: { status: 'active' } });
    const assignments = await db.AssetAssignment.findAll({
      include: [
        { model: db.Asset, as: 'asset' },
        { model: db.Employee, as: 'employee' }
      ],
      where: { status: 'assigned' }
    });
    
    const assetCount = assets.length;
    const employeeCount = employees.length;
    const assignedCount = assignments.length;
    const availableCount = Math.max(0, assetCount - assignedCount);
    
    res.render('dashboard', {
      username: req.user ? req.user.username : 'Guest',
      assetCount,
      employeeCount,
      assignedCount,
      availableCount,
      assignments: assignments.slice(0, 10),
      statusColors
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', {
      username: req.user ? req.user.username : 'Guest',
      assetCount: 0,
      employeeCount: 0,
      assignedCount: 0,
      availableCount: 0,
      assignments: [],
      statusColors,
      error: 'Failed to load dashboard data'
    });
  }
});
      module.exports = router;

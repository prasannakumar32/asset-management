const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated } = require('../middleware/authhandler');
const assets = require('../asset/assetRoute');
const employees = require('../employee/employeeRoute');
const assetCategories = require('../assetCategories/assetCategoryRoute');
const assetAssignments = require('../assetAssignment/assetAssignmentRoute');
const assetHistory = require('../assetHistory/assetHistoryRoute');
const stock = require('../stock/stockRoute');

// Assets page
router.get('/assets', ensureAuthenticated, require('../asset/assetController').list);

//create asset and edit assert 
router.get('/assets/form', ensureAuthenticated, require('../asset/assetController').showAssetForm);
router.get('/assets/:id/form', ensureAuthenticated, require('../asset/assetController').showAssetForm);

// Get single asset
router.get('/assets/:id', ensureAuthenticated, require('../asset/assetController').getById);

// Create Asset 
router.post('/assets', ensureAuthenticated, require('../asset/assetController').create);

// Update asset
router.put('/assets/:id', ensureAuthenticated, require('../asset/assetController').update);

// Delete asset
router.delete('/assets/:id', ensureAuthenticated, require('../asset/assetController').delete);
router.post('/assets/:id/delete', (req, res) => {
  require('../asset/assetController').delete(req, res);
});

// Employees page
router.get('/employee', ensureAuthenticated, (req, res) => {
  res.render('employee/employee');
});

// Asset Assignment page
router.get('/asset-assignment', ensureAuthenticated, (req, res) => {
  res.render('asset-assignment/asset-assignment');
});

// Asset Categories page
router.get('/asset-categories', ensureAuthenticated, (req, res) => {
  res.render('asset-categories/asset-categories');
});

// API routes
router.use('/api/assets', assets);
router.use('/api/employees', employees);
router.use('/api/asset-categories', assetCategories);
router.use('/api/stock', stock);
router.use('/api/asset-assignments', assetAssignments);
router.use('/api/asset-history', assetHistory);

// Asset Assignment Page
router.get('/asset-assignment', ensureAuthenticated, (req, res) => {
  res.render('asset-assignment/asset-assignment');
});
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

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
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
      username: req.user.username,
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
      username: req.user.username,
      assetCount: 0,
      employeeCount: 0,
      assignedCount: 0,
      availableCount: 0,
      assignments: [],
      statusColors
    });
  }
});
      module.exports = router;

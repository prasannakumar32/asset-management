const express = require('express');
const router = express.Router();
const passport = require('passport');

// Import controllers
const assetController = require('../asset/assetController');
const employeeController = require('../employee/employeeController');
const assetAssignmentController = require('../assetAssignment/assetAssignmentController');
const dashboardController = require('../dashboard/dashboardController');


// Authentication Routes
router.get('/login', (req, res) => res.render('login'));

router.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/login'));
});

router.post('/login', 
  passport.authenticate('local', { 
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: false
  })
);

// API Authentication
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

// Asset Routes
router.get('/assets', assetController.list);
router.get('/assets/form', assetController.showAssetForm);
router.get('/assets/:id/form', assetController.showAssetForm);
router.get('/assets/:id', assetController.viewAsset);
router.post('/assets', assetController.create);
router.put('/assets/:id', assetController.update);
router.delete('/assets/:id', assetController.delete);
router.post('/assets/:id/delete', (req, res) => assetController.delete(req, res));

// Employee Routes
const employeeRoutes = require('../employee/employeeRoute');
router.get('/employee', employeeController.list);
router.use('/employee', employeeRoutes);

// Asset Assignment Routes
router.get('/asset-assignment', (req, res) => {
  res.render('asset-assignment/asset-assignment');
});

router.get('/asset-assignment/issue', (req, res) => {
  res.render('asset-assignment/issue-form');
});

router.get('/asset-assignment/return', assetAssignmentController.showReturnForm);
router.get('/asset-assignment/scrap', assetAssignmentController.showScrapForm);

// Asset Categories Route
router.get('/asset-categories', (req, res) => {
  res.render('asset-categories/asset-categories');
});

// Dashboard Routes
router.get('/dashboard', dashboardController.getDashboard);

module.exports = router;

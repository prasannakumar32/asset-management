const express = require('express');
const router = express.Router();
const passport = require('passport');

// Root route - redirect to login or dashboard
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Import controllers
const assetController = require('../asset/assetController');
const employeeController = require('../employee/employeeController');
const assetAssignmentController = require('../assetAssignment/assetAssignmentController');
const assetCategoryController = require('../assetCategories/assetCategoryController');
const stockController = require('../stock/stockController');
const assetHistoryController = require('../assetHistory/assetHistoryController');

// import route files
const dashboardRoutes = require('../dashboard/dashboardRoute');

// authentication Routes
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('login');
});

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

// Middleware to protect routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// api authentication
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

// Asset Route - Protected
const assetRoutes = require('../asset/assetRoute');
router.get('/assets', ensureAuthenticated, assetController.list);
router.get('/assets/form', ensureAuthenticated, assetController.showAssetForm);
router.get('/assets/:id/form', ensureAuthenticated, assetController.showAssetForm);
router.get('/assets/:id', ensureAuthenticated, assetController.viewAsset);
router.post('/assets', ensureAuthenticated, assetController.create);
router.put('/assets/:id', ensureAuthenticated, assetController.update);
router.delete('/assets/:id', ensureAuthenticated, assetController.delete);

// api routes for assets
router.use('/api/assets', assetRoutes);

// employee routes - Protected
const employeeRoutes = require('../employee/employeeRoute');
router.use('/api/employee', employeeRoutes);
router.get('/employee', ensureAuthenticated, employeeController.list);
router.get('/employee/form', ensureAuthenticated, employeeController.showForm);
router.get('/employee/:id/form', ensureAuthenticated, employeeController.showForm);
router.get('/employee/:id', ensureAuthenticated, employeeController.view);
router.get('/employee/:id/view', ensureAuthenticated, employeeController.view);
router.post('/employee', ensureAuthenticated, employeeController.create);
router.put('/employee/:id', ensureAuthenticated, employeeController.update);
router.delete('/employee/:id', ensureAuthenticated, employeeController.delete);

// asset assignment Routes - Protected
router.get('/asset-assignment', ensureAuthenticated, (req, res) => {
  res.render('asset-assignment/asset-assignment');
});

router.get('/asset-assignment/issue', ensureAuthenticated, (req, res) => {
  res.render('asset-assignment/issue-form');
});

router.post('/asset-assignment', ensureAuthenticated, assetAssignmentController.createAssignment);

router.get('/asset-assignment/return', ensureAuthenticated, assetAssignmentController.showReturnForm);
router.post('/asset-assignment/return', ensureAuthenticated, assetAssignmentController.returnAsset);

router.get('/asset-assignment/scrap', ensureAuthenticated, (req, res) => {
  res.render('asset-assignment/scrap-form');
});

// Asset Categories Routes - Protected
const assetCategoriesRoutes = require('../assetCategories/assetCategoryRoute');
router.get('/asset-categories', ensureAuthenticated, assetCategoryController.showCategoryPage);
router.get('/asset-categories/form', ensureAuthenticated, assetCategoryController.showCategoryForm);
router.get('/asset-categories/:id/form', ensureAuthenticated, assetCategoryController.showCategoryForm);
router.get('/asset-categories/:id/view', ensureAuthenticated, assetCategoryController.viewCategory);

// api routes for asset categories
router.use('/api/asset-categories', assetCategoriesRoutes);

// Dashboard Routes - Protected
router.use('/dashboard', ensureAuthenticated, dashboardRoutes);

// Stock Routes - Protected
router.get('/stock', ensureAuthenticated, stockController.showStockPage);

// api routes for stock
router.use('/api/stock', require('../stock/stockRoute'));

// asset history page route - Protected
router.get('/asset-history', ensureAuthenticated, assetHistoryController.list);
router.get('/asset-history/:id', ensureAuthenticated, assetHistoryController.list);

module.exports = router;

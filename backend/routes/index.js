const express = require('express');
const router = express.Router();
const passport = require('passport');

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

// Asset Route
const assetRoutes = require('../asset/assetRoute');
router.get('/assets', assetController.list);
router.get('/assets/form', assetController.showAssetForm);
router.get('/assets/:id/form', assetController.showAssetForm);
router.get('/assets/:id', assetController.viewAsset);
router.post('/assets', assetController.create);
router.put('/assets/:id', assetController.update);
router.delete('/assets/:id', assetController.delete);

// api routes for assets
router.use('/api/assets', assetRoutes);

// employee routes
const employeeRoutes = require('../employee/employeeRoute');
router.use('/api/employee', employeeRoutes);
router.get('/employee', employeeController.list);
router.get('/employee/form', employeeController.showForm);
router.get('/employee/:id/form', employeeController.showForm);
router.get('/employee/:id', employeeController.view);
router.get('/employee/:id/view', employeeController.view);
router.post('/employee', employeeController.create);
router.put('/employee/:id', employeeController.update);
router.delete('/employee/:id', employeeController.delete);

// asset assignment Routes

// asset assignment Routes
router.get('/asset-assignment', (req, res) => {
  res.render('asset-assignment/asset-assignment');
});

router.get('/asset-assignment/issue', (req, res) => {
  res.render('asset-assignment/issue-form');
});

router.post('/asset-assignment', assetAssignmentController.createAssignment);

router.get('/asset-assignment/return', assetAssignmentController.showReturnForm);
router.post('/asset-assignment/return', assetAssignmentController.returnAsset);

router.get('/asset-assignment/scrap', (req, res) => {
  res.render('asset-assignment/scrap-form');
});

// Asset Categories Routes
const assetCategoriesRoutes = require('../assetCategories/assetCategoryRoute');
router.get('/asset-categories', assetCategoryController.showCategoryPage);
router.get('/asset-categories/form', assetCategoryController.showCategoryForm);
router.get('/asset-categories/:id/form', assetCategoryController.showCategoryForm);
router.get('/asset-categories/:id/view', assetCategoryController.viewCategory);

// api routes for asset categories
router.use('/api/asset-categories', assetCategoriesRoutes);

// Dashboard Routes
router.use('/dashboard', dashboardRoutes);

// Stock Routes
router.get('/stock', stockController.showStockPage);

// api routes for stock
router.use('/api/stock', require('../stock/stockRoute'));

// asset history page route
router.get('/asset-history', assetHistoryController.list);
router.get('/asset-history/:id', assetHistoryController.list);

module.exports = router;

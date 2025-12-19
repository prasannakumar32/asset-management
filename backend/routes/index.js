const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated } = require('../middleware/authhandler');
const db = require('../models');

const assets = require('../asset/assetRoute');
const employees = require('../employee/employeeRoute');
const assetCategories = require('../assetCategories/assetCategoryRoute');
const assetAssignments = require('../assetAssignment/assetAssignmentRoute');
const assetHistory = require('../assetHistory/assetHistoryRoute');
const stock = require('../stock/stockRoute');

//api routes
router.use('/api/assets', assets);
router.use('/api/employees', employees);
router.use('/api/asset-categories', assetCategories);
router.use('/api/stock', stock);
router.use('/api/asset-assignments', assetAssignments);
router.use('/api/asset-history', assetHistory);
router.get('/login', (req, res) => res.sendFile('login.html', { root: '.' }));
router.get('/api/login', (req, res) => res.sendFile('login.html', { root: '.' }));
router.get('/logout', (req, res) => { 
  req.logout();
  res.redirect('/login');
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', { 
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

router.post('/api/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      return res.json({ success: true, user: { id: user.id, username: user.username } });
    });
  })(req, res, next);
});

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.sendFile('dashboard.html', { root: '.' });
});

module.exports = router;
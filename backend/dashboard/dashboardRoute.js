const express = require('express');
const router = express.Router();
const dashboardController = require('../dashboard/dashboardController');

// Dashboard page route
router.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    username: req.user?.username || 'Guest',
    currentPage: 'dashboard'
  });
});

// Dashboard API route
router.get('/api', dashboardController.getDashboardData);

module.exports = router;

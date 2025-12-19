const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/authhandler');
const stockController = require('./stockController');

// get route for stock 
router.get('/', stockController.stockView);

// get route for stock data 
router.get('/data', stockController.stockData);

module.exports=router;

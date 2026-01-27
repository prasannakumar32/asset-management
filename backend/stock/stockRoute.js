const express = require('express');
const router = express.Router();
const stockController = require('./stockController');

// API route for stock data
router.get('/', stockController.getStockData);

module.exports=router;

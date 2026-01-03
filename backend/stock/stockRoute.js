const express = require('express');
const router = express.Router();
const stockController = require('./stockController');

// get route for stock 
router.get('/', stockController.stockView);

module.exports=router;

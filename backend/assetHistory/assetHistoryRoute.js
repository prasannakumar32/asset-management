const express = require('express');
const router = express.Router();
const assetHistoryController = require('./assetHistoryController');

//asset history route 
router.get('/', assetHistoryController.listAPI);
router.get('/:id', assetHistoryController.getAssetHistory);

module.exports = router;
const express = require('express');
const router = express.Router();
const assetHistoryController = require('./assetHistoryController');
// Get all assets history
router.get('/all', assetHistoryController.listAllAssetHistories);
// Get single asset history by id
router.get('/:id', assetHistoryController.getAssetHistory);

module.exports = router;
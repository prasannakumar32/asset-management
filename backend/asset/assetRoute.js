const express = require('express');
const router = express.Router();
const assetController = require('./assetController');

// Get form option
router.get('/asset-form-options', assetController.getFormOptions);

// Get assets as json  
router.get('/', assetController.listAPI);

// Get a single asset by id
router.get('/:id', assetController.getAssetById);

// Create a new asset
router.post('/', assetController.create);

// Update an asset
router.put('/:id', assetController.update);

// Delete an asset
router.delete('/:id', assetController.delete);

module.exports = router;

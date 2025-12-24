const express = require('express');
const router = express.Router();
const assetController = require('./assetController');

// Get all assets
router.get('/', assetController.list);

// Show asset form 
router.get('/form', assetController.showAssetForm);
router.get('/:id/form', assetController.showAssetForm);

// Create a new asset
router.post('/', assetController.create);

// Get a single asset
router.get('/:id', assetController.getById);

// Update an asset
router.put('/:id', assetController.update);

// Delete an asset
router.delete('/:id', assetController.delete);
router.post('/:id/delete', assetController.delete);

module.exports = router;

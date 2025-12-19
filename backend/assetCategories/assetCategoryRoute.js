const express = require('express');
const router = express.Router();
const assetCategoryController = require('./assetCategoryController');

// Get all asset categories
router.get('/', assetCategoryController.list);

// Create a new asset category
router.post('/', assetCategoryController.create);

// Get a single asset category
router.get('/:id', assetCategoryController.getById);

// Update an asset category
router.put('/:id', assetCategoryController.update);

// Delete an asset category
router.delete('/:id', assetCategoryController.delete);

module.exports = router;
const express = require('express');
const router = express.Router();
const assetCategoryController = require('./assetCategoryController');

// Get category by id
router.get('/:id', assetCategoryController.getCategoryById);

//get asset category list
router.get('/', assetCategoryController.listAPI);

// Create a new asset category
router.post('/', assetCategoryController.create);

// Update an asset category
router.put('/:id', assetCategoryController.update);

// Delete an asset category
router.delete('/:id', assetCategoryController.delete);

module.exports = router;
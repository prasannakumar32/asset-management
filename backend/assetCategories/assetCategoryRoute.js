const express = require('express');
const router = express.Router();
const assetCategoryController = require('./assetCategoryController');

// Get all asset categories
router.get('/', assetCategoryController.list);

// Create a new asset category
router.post('/', assetCategoryController.create);

// Form routes (must come before /:id routes)
router.get('/form', assetCategoryController.showCategoryForm);
router.get('/:id/form', assetCategoryController.showCategoryForm);

// View single category
router.get('/:id', assetCategoryController.viewCategory);

// Update an asset category
router.put('/:id', assetCategoryController.update);

// Delete an asset category
router.delete('/:id', assetCategoryController.delete);
router.post('/:id/delete', assetCategoryController.delete);

module.exports = router;
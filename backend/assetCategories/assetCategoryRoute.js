const express = require('express');
const router = express.Router();
const assetCategoryController = require('./assetCategoryController');

// Create a new asset category
router.post('/', assetCategoryController.create);

// Update an asset category
router.put('/:id', assetCategoryController.update);

// Delete an asset category
router.delete('/:id', assetCategoryController.delete);
router.post('/:id/delete', assetCategoryController.delete);

//show category form 
router.get('/form', assetCategoryController.showCategoryForm);
router.get('/:id/form', assetCategoryController.showCategoryForm);
router.get('/:id/view', assetCategoryController.viewCategory);

module.exports = router;
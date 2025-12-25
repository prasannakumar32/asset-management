const express = require('express');
const router = express.Router();
const assetController = require('./assetController');

// API endpoint to get assets as JSON
router.get('/', assetController.listAPI);

// Create a new asset
router.post('/', assetController.create);

// Update an asset
router.put('/:id', assetController.update);

// Delete an asset
router.delete('/:id', assetController.delete);

module.exports = router;

const express = require('express');
const router = express.Router();
const assetAssignmentController = require('./assetAssignmentController');

// Create asset assignment 
router.post('/', assetAssignmentController.createAssignment);

// Update asset assignment
router.put('/:id', assetAssignmentController.updateAssignment);

// Delete asset assignment 
router.delete('/:id', assetAssignmentController.deleteAssignment);

// Return asset
router.post('/return', assetAssignmentController.returnAsset);

// Get assignments by employee
router.get('/employee/:employeeId', assetAssignmentController.getAssignmentsByEmployee);

// Handle scrap submission
router.post('/scrap', assetAssignmentController.scrapAsset);

module.exports = router;

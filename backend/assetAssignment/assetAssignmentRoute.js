const express = require('express');
const router = express.Router();
const assetAssignmentController = require('./assetAssignmentController');

// Get all asset assignments 
router.get('/', assetAssignmentController.listAssignments);

// Create asset assignment 
router.post('/', assetAssignmentController.createAssignment);

// Get single asset assignment by id 
router.get('/:id', assetAssignmentController.getAssignment);

// Update asset assignment
router.put('/:id', assetAssignmentController.updateAssignment);

// Delete asset assignment 
router.delete('/:id', assetAssignmentController.deleteAssignment);

// Return asset
router.post('/return', assetAssignmentController.returnAsset);

// Get assignments by employee
router.get('/employee/:employeeId', assetAssignmentController.getAssignmentsByEmployee);

// Show scrap form
router.get('/scrap', assetAssignmentController.showScrapForm);

// Handle scrap submission
router.post('/scrap', assetAssignmentController.scrapAsset);

module.exports = router;

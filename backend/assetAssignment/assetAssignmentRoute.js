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

module.exports = router;

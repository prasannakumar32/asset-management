const express = require('express');
const router = express.Router();
const employeeController = require('./employeeController');

// Get form options
router.get('/employee-form-options', employeeController.getFormOptions);

// Get employees as JSON
router.get('/', employeeController.listAPI);

// Get a single employee by id
router.get('/:id', employeeController.getEmployeeById);

// Create a new employee
router.post('/', employeeController.create);

// Update an employee
router.put('/:id', employeeController.update);

// Delete an employee
router.delete('/:id', employeeController.delete);

// View employee details (must come before :id route for web routes)
router.get('/:id/view', employeeController.view);

// Show form for creating a new employee
router.get('/form', employeeController.showForm);
router.get('/new', employeeController.showForm);

// Show form for editing an employee
router.get('/:id/form', employeeController.showForm);

module.exports = router;
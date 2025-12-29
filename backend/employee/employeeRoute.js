const express = require('express');
const router = express.Router();
const employeeController = require('./employeeController');

// Show form for creating a new employee
router.get('/form', employeeController.showForm);
router.get('/new', employeeController.showForm);

// Create a new employee
router.post('/', employeeController.create);

// Show form for editing an employee
router.get('/:id(\\d+)/form', employeeController.showForm);

// Update an employee
router.put('/:id(\\d+)', employeeController.update);

// Delete an employee
router.delete('/:id(\\d+)', employeeController.delete);
router.post('/:id(\\d+)/delete', employeeController.delete);

// View employee details
router.get('/:id(\\d+)', employeeController.view);

// List all employees (keep this last as it's the most general route)
router.get('/', employeeController.list);

module.exports = router;
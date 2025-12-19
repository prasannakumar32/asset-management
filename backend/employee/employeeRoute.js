const express = require('express');
const router = express.Router();
const employeeController = require('./employeeController');

// Get all employees
router.get('/', employeeController.list);

// Create a new employee
router.post('/', employeeController.create);

// Get a single employee
router.get('/:id', employeeController.getById);

// Update an employee
router.put('/:id', employeeController.update);

// Delete an employee
router.delete('/:id', employeeController.delete);

module.exports = router;
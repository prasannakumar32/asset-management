const express = require('express');
const router = express.Router();
const employeeController = require('./employeeController');
//list employee for postman 
router.get('/', employeeController.listAPI);
//list employee for ui
router.get('/', employeeController.list);

// Show form for creating a new employee
router.get('/form', employeeController.showForm);
router.get('/new', employeeController.showForm);

// Create a new employee
router.post('/', employeeController.create);

// Show form for editing an employee
router.get('/:id/form', employeeController.showForm);

// Update an employee
router.put('/:id', employeeController.update);

// Delete an employee
router.delete('/:id', employeeController.delete);
router.post('/:id/delete', employeeController.delete);

// View employee details
router.get('/:id', employeeController.view);

module.exports = router;
const { Op } = require('sequelize');
const db = require('../models');
const Employee = db.Employee;

// Helper functions for form data and options
const getFormData = (req) => {
    const formData = {};
    for (const key in req.body) {
        formData[key] = req.body[key];
    }
    return formData;
};

const getFormOptions = async () => {
    const departments = await Employee.findAll({
        attributes: ['department'],
        where: { department: { [Op.ne]: null, [Op.ne]: '' } },
        order: [['department', 'ASC']],
        raw: true
    });
    
    const branches = await Employee.findAll({
        attributes: ['branch'],
        where: { branch: { [Op.ne]: null, [Op.ne]: '' } },
        order: [['branch', 'ASC']],
        raw: true
    });

    // Get unique departments and branches
    const uniqueDepartments = [...new Set(departments.map(d => d.department).filter(Boolean))];
    const uniqueBranches = [...new Set(branches.map(b => b.branch).filter(Boolean))];

    return {
        departments: uniqueDepartments,
        branches: uniqueBranches,
        statuses: ['active', 'inactive']
    };
};

const parseEmployeeData = (employeeData) => {
// Handle date fields
    employeeData.hire_date = (employeeData.hire_date && typeof employeeData.hire_date === 'string' && employeeData.hire_date.trim() !== '') 
        ? new Date(employeeData.hire_date) 
        : new Date();
    
// Handle optional fields
    const optionalFields = ['phone', 'position', 'notes'];
    optionalFields.forEach(field => {
        employeeData[field] = (employeeData[field] && typeof employeeData[field] === 'string' && employeeData[field].trim() !== '') 
            ? employeeData[field].trim() 
            : null;
    });
    
    return employeeData;
};

const generateEmployeeId = async () => {
    const lastEmployee = await Employee.findOne({
        attributes: ['employee_id'],
        order: [['employee_id', 'DESC']],
        limit: 1
    });
    
    let lastId = lastEmployee && lastEmployee.employee_id 
        ? ((match = lastEmployee.employee_id.match(/\d+/)) ? parseInt(match[0]) : 0) 
        : 0;
    
    return `EMP${String(lastId + 1).padStart(4, '0')}`;
};

const renderFormWithError = async (res, isEdit, error, formData = null, employee = null) => {
    const options = await getFormOptions();
    
    return res.render('employee/employee-form', {
        isEdit: isEdit,
        employee: employee,
        departments: options.departments,
        branches: options.branches,
        statuses: options.statuses,
        currentPage: 'employees',
        formData: formData || getFormData(res.req),
        hireDateValue: employee ? employee.hire_date : new Date().toISOString().split('T')[0],
        error: error
    });
};

exports.list = async (req, res) => {
    try {
        const options = await getFormOptions();
        return res.render('employee/employee', {
            title: 'Employees',
            currentPage: 'employees',
            departments: options.departments,
            branches: options.branches,
            statuses: options.statuses
        });
    } catch (error) {
        console.error('Error rendering employee page:', error);
        return res.status(500).render('error', { error: 'Error loading employees page' });
    }
};

// endpoint for employees list
exports.listAPI = async (req, res) => {
    try {
        const { department = '', status = '', branch = '' } = req.query;
        const whereClause = {};

// Build where clause
        if (department) whereClause.department = department;
        if (status && ['active', 'inactive'].includes(status)) whereClause.status = status;
        if (branch) whereClause.branch = { [Op.in]: branch.split(',').map(b => b.trim()).filter(Boolean) };

        const employees = await Employee.findAll({
            where: whereClause,
            order: [['first_name', 'ASC']]
        });

        return res.json({ success: true, data: { employees } });
    } catch (error) {
        console.error('Error fetching employees:', error);
        return res.status(500).json({
            success: false,
            error: 'Error fetching employees',
            message: error.message
        });
    }
};


// Show employee form for edit and create
exports.showForm = async (req, res) => {
    try {
        const { id } = req.params;
        const isEdit = !!id;
        const options = await getFormOptions();
        
        let employee = null;
        if (isEdit) {
            employee = await Employee.findByPk(id);
            if (!employee) {
                return res.status(404).render('error', { error: 'Employee not found' });
            }
        }
        
        return res.render('employee/employee-form', {
            title: isEdit ? 'Edit Employee' : 'Create Employee',
            currentPage: 'employees',
            isEdit: isEdit,
            employee: employee,
            departments: options.departments,
            branches: options.branches,
            statuses: options.statuses
        });
    } catch (error) {
        console.error('Error loading employee form:', error);
        return res.status(500).render('error', { error: 'Error loading employee form' });
    }
};

exports.view = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findByPk(id);
        
        if (!employee) {
            return res.status(404).render('error', { error: 'Employee not found' });
        }

        // Get assigned assets for this employee
        const assignments = await db.AssetAssignment.findAll({
            where: { 
                employee_id: id,
                status: 'assigned'
            },
            include: [
                { 
                    model: db.Asset, 
                    as: 'asset', 
                    attributes: ['id', 'name', 'asset_tag', 'serial_number', 'status'],
                    include: [{ 
                        model: db.AssetCategory, 
                        as: 'category', 
                        attributes: ['id', 'name'] 
                    }]
                }
            ],
            order: [['assigned_date', 'DESC']]
        });
        
        return res.render('employee/employee-view', {
            title: 'Employee Details',
            currentPage: 'employees',
            employee: employee,
            assignments: assignments
        });
    } catch (error) {
        console.error('Error viewing employee:', error);
        return res.status(500).render('error', { error: 'Error fetching employee' });
    }
};

exports.create = async (req, res) => {
    try {
        let employeeData = parseEmployeeData(req.body);
        
        // Validate required fields
        const requiredFields = ['first_name', 'email', 'department', 'branch', 'status', 'hire_date'];
        const missingFields = [];
        
        requiredFields.forEach(field => {
            if (!employeeData[field] || (typeof employeeData[field] === "string" && employeeData[field].trim() === '')) {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            const fieldErrors = {};
            missingFields.forEach(field => {
                fieldErrors[field] = `${field.replace('_', ' ')} is required`;
            });
            
            return res.status(400).json({
                success: false,
                error: 'Required fields are missing',
                fieldErrors
            });
        }
        
        // Handle employee ID
        if (!employeeData.employee_id || employeeData.employee_id.trim() === '') {
            employeeData.employee_id = await generateEmployeeId();
        } else {
            const existingEmployee = await Employee.findOne({
                where: { employee_id: employeeData.employee_id.trim() }
            });
            if (existingEmployee) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Employee ID already exists. Please use a different ID or leave empty to auto-generate.',
                    fieldErrors: {
                        employee_id: 'Employee ID already exists'
                    }
                });
            }
        }
        
        // Check duplicate email
        if (employeeData.email && employeeData.email.trim() !== '') {
            const existingEmployee = await Employee.findOne({
                where: { email: employeeData.email.trim().toLowerCase() }
            });
            if (existingEmployee) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email already exists. Please use a different email address.',
                    fieldErrors: {
                        email: 'Email already exists'
                    }
                });
            }
        }
        
        // Create employee with transaction
        const transaction = await db.sequelize.transaction();
        try {
            const employee = await Employee.create(employeeData, { transaction });
            await transaction.commit();
            
            return res.status(201).json({ 
                success: true, 
                message: 'Employee created successfully',
                data: { employee }
            });
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('Error creating employee:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const fieldErrors = {};
            error.errors.forEach(err => {
                fieldErrors[err.path] = err.message;
            });
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                fieldErrors
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            let field, message;
            if (error.errors[0].path === 'employee_id') {
                field = 'employee_id';
                message = 'Employee ID already exists';
            } else if (error.errors[0].path === 'email') {
                field = 'email';
                message = 'Email already exists';
            } else {
                field = error.errors[0].path;
                message = `${field} already exists`;
            }
            
            return res.status(400).json({
                success: false,
                error: message,
                fieldErrors: {
                    [field]: message
                }
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            error: 'Error creating employee',
            message: error.message 
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        let employeeData = parseEmployeeData(req.body);
        
        // Validate required fields
        const requiredFields = ['first_name', 'email', 'department', 'branch', 'status', 'hire_date'];
        const missingFields = [];
        
        requiredFields.forEach(field => {
            if (!employeeData[field] || (typeof employeeData[field] === "string" && employeeData[field].trim() === '')) {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            const fieldErrors = {};
            missingFields.forEach(field => {
                fieldErrors[field] = `${field.replace('_', ' ')} is required`;
            });
            
            return res.status(400).json({
                success: false,
                error: 'Required fields are missing',
                fieldErrors
            });
        }
        
        // Don't allow updating employee id
        delete employeeData.employee_id;
        
        // Check duplicate email 
        if (employeeData.email && employeeData.email.trim() !== '') {
            const existingEmployee = await Employee.findOne({
                where: { 
                    email: employeeData.email.trim().toLowerCase(),
                    id: { [Op.ne]: parseInt(id) }
                }
            });
            if (existingEmployee) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Email already exists. Please use a different email address.',
                    fieldErrors: {
                        email: 'Email already exists'
                    }
                });
            }
        }
        
        // Update employee
        const [updatedRowsCount] = await Employee.update(employeeData, { where: { id } });
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        // Get updated employee to return in response
        const updatedEmployee = await Employee.findByPk(id);
        
        return res.json({ 
            success: true, 
            message: 'Employee updated successfully',
            data: { employee: updatedEmployee }
        });
        
    } catch (error) {
        console.error('Error updating employee:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const fieldErrors = {};
            error.errors.forEach(err => {
                fieldErrors[err.path] = err.message;
            });
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                fieldErrors
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            let field, message;
            if (error.errors[0].path === 'email') {
                field = 'email';
                message = 'Email already exists';
            } else {
                field = error.errors[0].path;
                message = `${field} already exists`;
            }
            
            return res.status(400).json({
                success: false,
                error: message,
                fieldErrors: {
                    [field]: message
                }
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            error: 'Error updating employee',
            message: error.message 
        });
    }
};

exports.getFormOptions = async (req, res) => {
    try {
        const options = await getFormOptions();
        return res.json({ success: true, data: options });
    } catch (error) {
        console.error('Error fetching form options:', error);
        return res.status(500).json({
            success: false,
            error: 'Error fetching form options',
            message: error.message
        });
    }
};

exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findByPk(id);
        
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        return res.json({ success: true, data: { employee } });
    } catch (error) {
        console.error('Error fetching employee:', error);
        return res.status(500).json({
            success: false,
            error: 'Error fetching employee',
            message: error.message
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        const employee = await Employee.findByPk(id);
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }
        
        await Employee.destroy({ where: { id } });
        
        return res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        const errorMessage = error.message.includes('foreign key constraint') 
            ? 'Cannot delete employee: It has related records' 
            : 'Error deleting employee: ' + error.message;
            
        return res.status(500).json({ success: false, error: errorMessage });
    }
};

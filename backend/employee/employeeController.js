const { Op } = require('sequelize');
const db = require('../models');
const Employee = db.Employee;

// Helper functions for form data and options
const getFormData = (req) => {
    const formData = { ...req.body };
    return formData;
};

const getFormOptions = async () => {
    const departments = await Employee.findAll({
        attributes: [
            [db.Sequelize.fn('DISTINCT', db.Sequelize.col('department')), 'department']
        ],
        where: { department: { [Op.ne]: null } },
        order: [['department', 'ASC']],
        raw: true
    });
    
    const branches = await Employee.findAll({
        attributes: [
            [db.Sequelize.fn('DISTINCT', db.Sequelize.col('branch')), 'branch']
        ],
        where: { branch: { [Op.ne]: null } },
        order: [['branch', 'ASC']],
        raw: true
    });

    const departmentList = departments.map(d => d.department).filter(d => d);
    const branchList = branches.map(b => b.branch).filter(b => b);

    return {
        departments: departmentList.length > 0 ? departmentList : ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'],
        branches: branchList.length > 0 ? branchList : ['Head Office', 'North Branch', 'South Branch', 'East Branch', 'West Branch'],
        statuses: ['active', 'inactive']
    };
};

const parseEmployeeData = (employeeData) => {
// Handle date fields
    if (employeeData.hire_date && employeeData.hire_date.trim() !== '') {
        employeeData.hire_date = new Date(employeeData.hire_date);
    } else {
        employeeData.hire_date = new Date();
    }
    
// Handle optional fields
    const optionalFields = ['phone', 'position', 'notes'];
    optionalFields.forEach(field => {
        employeeData[field] = employeeData[field] && employeeData[field].trim() !== '' 
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
    
    let lastId = 0;
    if (lastEmployee && lastEmployee.employee_id) {
        const match = lastEmployee.employee_id.match(/\d+/);
        if (match) lastId = parseInt(match[0]);
    }
    
    return `EMP${String(lastId + 1).padStart(4, '0')}`;
};

const renderFormWithError = async (res, isEdit, error, formData = null, employee = null) => {
    const options = await getFormOptions();
    
    // Format hire date for form display - handle both string and Date formats
    let hireDateValue = '';
    if (formData?.hire_date) {
        if (typeof formData.hire_date === 'string') {
            hireDateValue = formData.hire_date;
        } else if (formData.hire_date instanceof Date) {
            hireDateValue = formData.hire_date.toISOString().split('T')[0];
        }
    } else if (employee?.hire_date) {
        hireDateValue = new Date(employee.hire_date).toISOString().split('T')[0];
    }
    
    return res.render('employee/employee-form', {
        isEdit,
        employee,
        ...options,
        currentPage: 'employee',
        formData: formData || getFormData(res.req),
        hireDateValue,
        error
    });
};

exports.list = async (req, res) => {
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

        const options = await getFormOptions();

        res.render('employee/employee', {
            employees,
            ...options,
            department,
            status,
            branch,
            currentPage: 'employee',
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        const options = await getFormOptions();
        res.render('employee/employee', {
            employees: [],
            ...options,
            department: req.query.department || '',
            status: req.query.status || '',
            branch: req.query.branch || '',
            currentPage: 'employee',
            error: 'Failed to load employees'
        });
    }
};

exports.listAPI = async (req, res) => {
    try {
        const { department = '', status = '', branch = '' } = req.query;
        const whereClause = {};

// Build where clause (same logic as list function)
        if (department) whereClause.department = department;
        if (status) whereClause.status = status;
        if (branch) whereClause.branch = { [Op.in]: branch.split(',').map(b => b.trim()).filter(Boolean) };

        const employees = await Employee.findAll({
            where: whereClause,
            order: [['first_name', 'ASC']]
        });

        res.json({ success: true, data: { employees } });
    } catch (error) {
        console.error('Error fetching employees API:', error);
        res.status(500).json({
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
            if (!employee) return res.redirect('/employee?error=Employee not found');
        }
        
        res.render('employee/employee-form', {
            isEdit,
            employee,
            ...options,
            currentPage: 'employee',
            error: req.query.error,
            success: req.query.success,
            hireDateValue: employee?.hire_date 
                ? new Date(employee.hire_date).toISOString().split('T')[0] 
                : ''
        });
    } catch (error) {
        console.error('Error loading employee form:', error);
        const options = await getFormOptions();
        res.render('employee/employee-form', {
            isEdit: !!req.params.id,
            employee: null,
            ...options,
            currentPage: 'employee',
            error: req.query.error || 'Error loading form',
            hireDateValue: ''
        });
    }
};

exports.view = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findByPk(id);
        
        if (!employee) return res.redirect('/employee?error=Employee not found');
        
        res.render('employee/employee-view', {
            employee,
            currentPage: 'employee',
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error viewing employee:', error);
        res.redirect('/employee?error=Error loading employee details');
    }
};

exports.create = async (req, res) => {
    try {
        let employeeData = parseEmployeeData(req.body);
        
        // Validate required fields
        const requiredFields = ['first_name', 'email', 'department', 'branch', 'status', 'hire_date'];
        const missingFields = [];
        
        requiredFields.forEach(field => {
            if (!employeeData[field] || employeeData[field].trim() === '') {
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
            // Check duplicate employee ID
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
            if (!employeeData[field] || employeeData[field].trim() === '') {
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
        
        // Don't allow updating employee ID
        delete employeeData.employee_id;
        
        // Check duplicate email (excluding current employee)
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
        
        // Get updated employee to return in API response
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
        res.json({ success: true, data: options });
    } catch (error) {
        console.error('Error fetching form options:', error);
        res.status(500).json({
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
        
        res.json({ success: true, data: { employee } });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching employee',
            message: error.message
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        await Employee.destroy({ where: { id } });
        
        // Check if this is an API request
        if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
            return res.json({ success: true, message: 'Employee deleted successfully' });
        }
        
        res.redirect('/employee?success=Employee deleted successfully');
    } catch (error) {
        console.error('Error deleting employee:', error);
            
        // Check if this is an API request
        if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
            return res.status(500).json({ success: false, error: 'Error deleting employee' });
        }
        
        res.redirect('/employee?error=Error deleting employee');
    }
};
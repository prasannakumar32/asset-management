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
    const optionalFields = ['phone', 'position', 'branch', 'notes'];
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
    
    return res.render('employee/employee-form', {
        isEdit,
        employee,
        ...options,
        currentPage: 'employee',
        formData: formData || getFormData(res.req),
        hireDateValue: formData?.hire_date || '',
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
        
        // Handle employee ID
        if (!employeeData.employee_id || employeeData.employee_id.trim() === '') {
            employeeData.employee_id = await generateEmployeeId();
        } else {
            const existingEmployee = await Employee.findOne({
                where: { employee_id: employeeData.employee_id.trim() }
            });
            if (existingEmployee) {
                return renderFormWithError(res, false, 
                    `Employee ID '${employeeData.employee_id.trim()}' is already registered. Please use a different Employee ID.`);
            }
        }
        
        // Check duplicate email
        if (employeeData.email && employeeData.email.trim() !== '') {
            const existingEmployee = await Employee.findOne({
                where: { email: employeeData.email.trim() }
            });
            if (existingEmployee) {
                return renderFormWithError(res, false, 
                    'Email address already exists. Please use a different email address.');
            }
        }
        
        // Create employee
        await Employee.create(employeeData);
        res.redirect('/employee?success=Employee created successfully');
        
    } catch (error) {
        console.error('Error creating employee:', error);
        const errorMessage = error.name === 'SequelizeValidationError' 
            ? error.errors.map(e => e.message).join(', ')
            : error.name === 'SequelizeUniqueConstraintError'
            ? 'Employee ID or email already exists'
            : error.message;
            
        renderFormWithError(res, false, errorMessage);
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        let employeeData = parseEmployeeData(req.body);
        
        // Don't allow updating employee ID
        delete employeeData.employee_id;
        
        // Check duplicate email (excluding current employee)
        if (employeeData.email && employeeData.email.trim() !== '') {
            const existingEmployee = await Employee.findOne({
                where: { 
                    email: employeeData.email.trim(),
                    id: { [Op.ne]: parseInt(id) }
                }
            });
            if (existingEmployee) {
                const currentEmployee = await Employee.findByPk(id);
                return renderFormWithError(res, true, 
                    'Email address already exists. Please use a different email address.', 
                    getFormData(req), currentEmployee);
            }
        }
        
        // Update employee
        await Employee.update(employeeData, { where: { id } });
        
        res.redirect('/employee');
    } catch (error) {
        console.error('Error updating employee:', error);
        const errorMessage = error.name === 'SequelizeValidationError' 
            ? error.errors.map(e => e.message).join(', ')
            : error.name === 'SequelizeUniqueConstraintError'
            ? 'Email address already exists'
            : error.message;
            
        const currentEmployee = await Employee.findByPk(req.params.id);
        renderFormWithError(res, true, errorMessage, getFormData(req), currentEmployee);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        const employee = await Employee.findByPk(id);
        if (!employee) {
            return res.redirect('/employee?error=Employee not found');
        }
        
        await Employee.destroy({ where: { id } });
        
        res.redirect('/employee?success=Employee deleted successfully');
    } catch (error) {
        console.error('Error deleting employee:', error);
        const errorMessage = error.message.includes('foreign key constraint') 
            ? 'Cannot delete employee: It has related records that could not be removed' 
            : 'Error deleting employee: ' + error.message;
        res.redirect('/employee?error=' + encodeURIComponent(errorMessage));
    }
};
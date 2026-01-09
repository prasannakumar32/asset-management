const { Op } = require('sequelize');
const db = require('../models');
const Employee = db.Employee;

// Helper function to get distinct values
const getDistinctValues = async (field) => {
    return await Employee.findAll({
        attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col(field)), field]],
        where: { 
            [field]: { 
                [Op.and]: [
                    { [Op.ne]: null },
                    { [Op.ne]: '' }
                ]
            } 
        },
        raw: true
    }).then(results => {
        return results
            .map(item => item[field])
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
    });
};

// Helper function to get dropdown data
const getDropdownData = async () => {
    const [departments, branches] = await Promise.all([
        getDistinctValues('department'),
        getDistinctValues('branch')
    ]);
    return { departments, branches, statuses: ['active', 'inactive'] };
};

// Helper function to build where conditions
const buildWhereConditions = (department, status, branch) => {
    const whereConditions = {};
    if (department) whereConditions.department = department;
    if (status) whereConditions.status = status;
    if (branch) {
        whereConditions.branch = { [Op.in]: branch.split(',').map(b => b.trim()).filter(Boolean) };
    }
    return Object.keys(whereConditions).length > 0 ? whereConditions : undefined;
};

// Helper function to render error page
const renderError = async (res, view, error, additionalData = {}) => {
    const defaultData = {
        statuses: ['active', 'inactive'],
        currentPage: 'employee',
        error
    };
    
    // For forms, fetch dropdown data to populate dropdowns
    if (view.includes('employee-form')) {
        const dropdownData = await getDropdownData();
        defaultData.departments = dropdownData.departments;
        defaultData.branches = dropdownData.branches;
    } else {
        defaultData.departments = [];
        defaultData.branches = [];
    }
    
    return res.status(500).render(view, { ...defaultData, ...additionalData });
};

// List all employees with optional filters
exports.list = async (req, res) => {
    try {
        const { department = '', status = '', branch = '' } = req.query;
        
        const [dropdownData, filteredEmployees] = await Promise.all([
            getDropdownData(),
            Employee.findAll({
                where: buildWhereConditions(department, status, branch),
                order: [['first_name', 'ASC']],
                raw: true
            })
        ]);
        
        return res.render('employee/employee', {
            employee: filteredEmployees,
            ...dropdownData,
            department,
            status,
            branch,
            currentPage: 'employee'
        });
        
    } catch (error) {
        console.error('Error in employee list:', error);
        return await renderError(res, 'employee/employee', 'Error loading employee data. Please try again.');
    }
}

// List employee API
exports.listAPI = async (req, res) => {
    try {
        const { department = '', status = '', branch = '' } = req.query;
        
        const filteredEmployees = await Employee.findAll({
            where: buildWhereConditions(department, status, branch),
            order: [['first_name', 'ASC']],
            raw: true
        });
        
        return res.json({
            success: true,
            data: { employees: filteredEmployees }
        });
    } catch (error) {
        console.error('Error in employee list API:', error);
        return res.status(500).json({
            success: false,
            message: 'Error loading employee data. Please try again.',
            error: error.message
        });
    }
}

// Show form for create or edit
exports.showForm = async (req, res) => {
    try {
        const { id } = req.params;
        const isEdit = !!id;
        let employee = null;

        if (isEdit) {
            employee = await Employee.findByPk(id);
            if (!employee) {
                return res.redirect('/employee?error=Employee not found');
            }
        }

        const dropdownData = await getDropdownData();
        
        // Format hire date for input field if it exists
        const hireDateValue = employee?.hire_date 
            ? new Date(employee.hire_date).toISOString().split('T')[0] 
            : '';
        
        res.render('employee/employee-form', {
            employee,
            ...dropdownData,
            currentPage: 'employee',
            isEdit,
            error: req.query.error || null,
            formData: req.query.error ? req.query : {},
            hireDateValue
        });
    } catch (error) {
        console.error('Error loading employee form:', error);
        res.redirect('/employee');
    }
};

// View employee details for ui
exports.view = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findByPk(id);
        if (!employee) {
            return res.redirect('/employee');
        }
        res.render('employee/employee-view', {
            employee: employee.get({ plain: true }),
            currentPage: 'employee'
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.redirect('/employee');
    }
};

// Generate employee ID
const generateEmployeeId = async (transaction) => {
    const lastEmployee = await Employee.findOne({
        attributes: ['employee_id'],
        order: [['employee_id', 'DESC']],
        limit: 1,
        transaction
    });
    
    let lastId = 0;
    if (lastEmployee?.employee_id) {
        const match = lastEmployee.employee_id.match(/\d+/);
        if (match) lastId = parseInt(match[0]);
    }
    
    return `EMP${String(lastId + 1).padStart(4, '0')}`;
};

// Handle database errors
const handleDatabaseError = (error, req) => {
    if (error.original?.code === '23505') {
        if (error.original.constraint === 'employees_email_key') {
            return `Email address '${req.body.email}' is already registered. Please use a different email address.`;
        }
        if (error.original.constraint === 'employees_employee_id_key') {
            return `Employee ID '${req.body.employee_id}' is already registered. Please use a different Employee ID.`;
        }
    }
    return 'Error creating employee: ' + (error.errors?.[0]?.message || error.message);
};

// Create employee
exports.create = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { 
            first_name, last_name, email, phone, 
            department, position, branch, status, hire_date, employee_id, notes 
        } = req.body;
        
        let employeeData = {
            first_name,
            last_name,
            email,
            phone: phone || null,
            department,
            position: position || null,
            branch: branch || null,
            status,
            notes: notes || null,
            hire_date: hire_date || new Date()
        };

        // Handle employee ID
        if (!employee_id?.trim()) {
            employeeData.employee_id = await generateEmployeeId(transaction);
        } else {
            const existingEmployee = await Employee.findOne({
                where: { employee_id: employee_id.trim() },
                transaction
            });
            if (existingEmployee) {
                await transaction.rollback();
                return await renderError(res, 'employee/employee-form', 
                    `Employee ID '${employee_id.trim()}' is already registered. Please use a different Employee ID.`,
                    { formData: req.body, isEdit: false, hireDateValue: req.body.hire_date || '' }
                );
            }
            employeeData.employee_id = employee_id.trim();
        }

        await Employee.create(employeeData, { transaction });
        await transaction.commit();
        return res.redirect('/employee?success=Employee created successfully');
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating employee:', error);
        
        const errorMessage = handleDatabaseError(error, req);
        return await renderError(res, 'employee/employee-form', errorMessage, {
            formData: req.body,
            isEdit: false,
            hireDateValue: req.body.hire_date || ''
        });
    }
};

// Update employee
exports.update = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { 
            first_name, last_name, email, phone, 
            department, position, branch, status, hire_date, notes 
        } = req.body;
        
        const employee = await Employee.findByPk(id, { transaction });
        if (!employee) {
            await transaction.rollback();
            return res.redirect('/employee?error=Employee not found');
        }
        
        await employee.update({
            first_name,
            last_name,
            email,
            phone: phone || null,
            department,
            position,
            branch,
            status,
            hire_date: hire_date || employee.hire_date,
            notes
        }, { transaction });
        
        await transaction.commit();
        return res.redirect('/employee');
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating employee:', error);
        return await renderError(res, 'employee/employee-form', 
            'Error updating employee: ' + (error.errors?.[0]?.message || error.message),
            { 
                employee: { id: req.params.id, ...req.body },
                isEdit: true,
                hireDateValue: req.body.hire_date || ''
            }
        );
    }
};

// Delete employee
exports.delete = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
        await Employee.destroy({ 
            where: { id },
            transaction 
        });
        
        await transaction.commit();
        return res.redirect('/employee');
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting employee:', error);
        return res.redirect('/employee?error=Error deleting employee');
    }
};
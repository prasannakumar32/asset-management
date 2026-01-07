const { Op } = require('sequelize');
const db = require('../models');
const Employee = db.Employee;

// List all employees with optional filters
exports.list = async (req, res) => {
    try {
        const { department = '', status = '', branch = '' } = req.query;
// Get unique departments and branches using distinct queries
        const [departments, branches] = await Promise.all([
// Get distinct departments

Employee.findAll({
                attributes: [
                    [db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']
                ],
                where: { 
                    department: { 
                        [Op.and]: [
                            { [Op.ne]: null },
                            { [Op.ne]: '' }
                        ]
                    } 
                },
                raw: true
            }).then(results => {
                return results
                    .map(d => d.department)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
            }),
            
// Get distinct branches
            Employee.findAll({
                attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('branch')), 'branch']],
                where: { 
                    branch: { 
                        [Op.and]: [
                            { [Op.ne]: null },
                            { [Op.ne]: '' }
                        ]
                    } 
                },
                raw: true
            }).then(results => {
                return results
                    .map(b => b.branch)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
            })
        ]);
// Filter employees 
        const whereConditions = {};
        if (department) {
            whereConditions.department = department;
        }
        if (status) {
            whereConditions.status = status;
        }
        if (branch) {
            whereConditions.branch = { [Op.in]: branch.split(',').map(b => b.trim()).filter(Boolean) };
        }
        
        const filteredEmployees = await Employee.findAll({
            where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
            order: [['first_name', 'ASC']],
            raw: true
        });
        return res.render('employee/employee', {
            employee: filteredEmployees,
            departments: departments,
            branches: branches,
            statuses: ['active', 'inactive'],
            department: department,
            status: status,
            branch: branch
        });
        
    } catch (error) {
        console.error('Error in employee list:', error);
        return res.status(500).render('employee/employee', {
            employee: [],
            departments: [],
            branches: [],
            statuses: ['active', 'inactive'],
            department: '',
            status: '',
            branch: '',
            error: 'Error loading employee data. Please try again.'
        });
    }
}
//list employee 
exports.listAPI = async (req, res) => {
    try {
        const { department = '', status = '', branch = '' } = req.query;
        const whereConditions = {};
        if (department) {
            whereConditions.department = department;
        }
        if (status) {
            whereConditions.status = status;
        }
        if (branch) {
            whereConditions.branch = { [Op.in]: branch.split(',').map(b => b.trim()).filter(Boolean) };
        }
        const filteredEmployees = await Employee.findAll({
            where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
            order: [['first_name', 'ASC']],
            raw: true
        });
            return res.json({
            success: true,
            data: {
                employees: filteredEmployees
            }
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
//show form for create or edit 
exports.showForm = async (req, res) => {
    try {
        const { id } = req.params;
        const isEdit = !!id;
        let employee = null;
        let error = null;

        if (isEdit) {
            employee = await Employee.findByPk(id);
            if (!employee) {
                return res.redirect('/employee?error=Employee not found');
            }
        }
// Get unique values for dropdowns
        const [departments, branches] = await Promise.all([
            Employee.findAll({
                attributes: [
                    [db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']
                ],
                where: { 
                    department: { 
                        [Op.and]: [
                            { [Op.ne]: null },
                            { [Op.ne]: '' }
                        ]
                    } 
                },
                raw: true
            }).then(results => {
                return results
                    .map(d => d.department)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
            }), 
            Employee.findAll({
                attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('branch')), 'branch']],
                where: { 
                    branch: { 
                        [Op.and]: [
                            { [Op.ne]: null },
                            { [Op.ne]: '' }
                        ]
                    } 
                },
                raw: true
            }).then(results => {
                return results
                    .map(b => b.branch)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
            })
        ]);
        res.render('employee/employee-form', {
            employee,
            departments,
            branches,
            statuses: ['active', 'inactive'],
            isEdit,
            error: req.query.error || error,
            formData: req.query.error ? req.query : {}
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
            employee: employee.get({ plain: true })
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.redirect('/employee');
    }
};

exports.create = async (req, res) => {
    //initialize transaction
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
// Generate employee ID if not exist 
        if (!employee_id || employee_id.trim() === '') {
            const lastEmployee = await Employee.findOne({
                attributes: ['employee_id'],
                order: [['employee_id', 'DESC']],
                limit: 1,
                transaction
            });
            let lastId = 0;
            if (lastEmployee && lastEmployee.employee_id) {
                const match = lastEmployee.employee_id.match(/\d+/);
                if (match) {
                    lastId = parseInt(match[0]);
                }
            }
            employeeData.employee_id = `EMP${String(lastId + 1).padStart(4, '0')}`;
        } else {
 // Check if the provided employee_id already exists
            const existingEmployee = await Employee.findOne({
                where: { employee_id: employee_id.trim() },
                transaction
            });
            if (existingEmployee) {
                await transaction.rollback();
                return res.status(500).render('employee/employee-form', {
                    error: `Employee ID '${employee_id.trim()}' is already registered. Please use a different Employee ID.`,
                    formData: req.body,
                    departments: [],
                    branches: [],
                    statuses: ['active', 'inactive'],
                    isEdit: false
                });
            }
            employeeData.employee_id = employee_id.trim();
        }
        const employee = await Employee.create(employeeData, { transaction });
        await transaction.commit();
        return res.redirect('/employee?success=Employee created successfully');
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating employee:', error);
        
        // Handle duplicate email error specifically
        let errorMessage = 'Error creating employee: ' + (error.errors ? error.errors[0].message : error.message);
        if (error.original && error.original.code === '23505' && error.original.constraint === 'employees_email_key') {
            errorMessage = `Email address '${req.body.email}' is already registered. Please use a different email address.`;
        }
        // Handle duplicate employee ID error specifically
        if (error.original && error.original.code === '23505' && error.original.constraint === 'employees_employee_id_key') {
            errorMessage = `Employee ID '${req.body.employee_id}' is already registered. Please use a different Employee ID.`;
        }
        
        // Get departments and branches for the form
        const [departments, branches] = await Promise.all([
            Employee.findAll({
                attributes: [
                    [db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']
                ],
                where: { 
                    department: { 
                        [Op.and]: [
                            { [Op.ne]: null },
                            { [Op.ne]: '' }
                        ]
                    } 
                },
                raw: true
            }).then(results => {
                return results
                    .map(d => d.department)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
            }), 
            Employee.findAll({
                attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('branch')), 'branch']],
                where: { 
                    branch: { 
                        [Op.and]: [
                            { [Op.ne]: null },
                            { [Op.ne]: '' }
                        ]
                    } 
                },
                raw: true
            }).then(results => {
                return results
                    .map(b => b.branch)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
            })
        ]);
        
        return res.status(500).render('employee/employee-form', {
            error: errorMessage,
            formData: req.body,
            departments: departments,
            branches: branches,
            statuses: ['active', 'inactive'],
            isEdit: false
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
        
        // Update employee
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
        return res.status(500).render('employee/employee-form', {
            error: 'Error updating employee: ' + (error.errors ? error.errors[0].message : error.message),
            employee: { id: req.params.id, ...req.body },
            departments: [],
            branches: [],
            statuses: ['active', 'inactive'],
            isEdit: true
        });
    }
};

// Delete employee
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await db.sequelize.transaction();
        try {
            await Employee.destroy({ 
                where: { id },
                transaction 
            });   
            await transaction.commit();
            return res.redirect('/employee');
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('Error deleting employee:', error);
        return res.redirect('/employee?error=Error deleting employee');
    }
};
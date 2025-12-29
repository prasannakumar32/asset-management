const { Op } = require('sequelize');
const db = require('../models');
const Employee = db.Employee;
const AssetAssignment = db.AssetAssignment;
const Asset = db.Asset;

// Utility function to generate employee ID in format EMP0001
const generateEmployeeId = async () => {
  try {
    // Find the latest employee to get the highest ID
    const lastEmployee = await Employee.findOne({
      attributes: ['employee_id'],
      order: [['employee_id', 'DESC']],
      limit: 1,
      raw: true
    });

    let lastId = 0;
    if (lastEmployee && lastEmployee.employee_id) {
      // Extract the numeric part of the ID
      const match = lastEmployee.employee_id.match(/\d+/);
      if (match) {
        lastId = parseInt(match[0]);
      }
    }
    
    // Generate the next ID with leading zeros
    return `EMP${String(lastId + 1).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    // Fallback to timestamp-based ID if there's an error
    return `EMP${Date.now().toString().slice(-4)}`;
  }
};

// List all employees with optional filters
exports.list = async (req, res) => {
    try {
        const { department = '', status = '', branch = '' } = req.query;
        
        // 1. Get all employees first
        const employees = await Employee.findAll({
            order: [['first_name', 'ASC']],
            raw: true
        });

        // 2. Get unique departments and branches from the employees data
        const departments = [...new Set(employees
            .map(emp => emp.department)
            .filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
            
        const branches = [...new Set(employees
            .map(emp => emp.branch)
            .filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
            
        // 3. Filter employees based on query parameters
        const filteredEmployees = employees.filter(emp => {
            // Filter by department (case-insensitive)
            if (department && emp.department && 
                !emp.department.toLowerCase().includes(department.toLowerCase())) {
                return false;
            }
            
            // Filter by status
            if (status && emp.status !== status) {
                return false;
            }
            
            // Filter by branch (case-insensitive)
            if (branch && emp.branch && 
                !emp.branch.toLowerCase().includes(branch.toLowerCase())) {
                return false;
            }
            
            return true;
        });
        
        // 4. Get asset assignments for filtered employees
        const employeeIds = filteredEmployees.map(emp => emp.id);
        const assignments = await AssetAssignment.findAll({
            where: { employee_id: { [Op.in]: employeeIds } },
            include: [{
                model: Asset,
                as: 'asset',
                where: { status: 'assigned' },
                required: false
            }],
            raw: true,
            nest: true
        });
        
        // 5. Map assignments to employees
        const employeeData = filteredEmployees.map(emp => {
            const empAssignments = assignments.filter(a => a.employee_id === emp.id);
            return {
                ...emp,
                assignments: empAssignments
            };
        });
        
        // 6. Render the view with the filtered data
        return res.render('employee/employee', {
            employee: employeeData,
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
exports.showForm = async (req, res) => {
    try {
        const { id } = req.params;
        let employee = null;
        let isEdit = false;
        let error = null;

        if (id) {
            // Edit mode - fetch the employee
            employee = await Employee.findByPk(id);
            if (!employee) {
                error = 'Employee not found';
                return res.redirect('/employee');
            }
            employee = employee.get({ plain: true });
            isEdit = true;
        }

        // Get unique values for dropdowns
        const [departments, branches] = await Promise.all([
            // Get distinct departments with case-insensitive ordering
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
                // Sort case-insensitive after fetching
                return results
                    .map(d => d.department)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
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
                    .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));
            })
        ]);

        res.render('employee/employee-form', {
            employee,
            departments,
            branches,
            statuses: ['active', 'inactive'],
            isEdit,
            error
        });

    } catch (error) {
        console.error('Error loading employee form:', error);
        res.redirect('/employee');
    }
};

// View employee details
exports.view = async (req, res) => {
    try {
        const { id } = req.params;
        
        const employee = await Employee.findByPk(id, {
            include: [{
                model: AssetAssignment,
                as: 'assignments',
                include: [{
                    model: Asset,
                    as: 'asset'
                }]
            }]
        });

        if (!employee) {
            req.flash('error', 'Employee not found');
            return res.redirect('/employee');
        }

        res.render('employee/employee-view', {
            employee: employee.get({ plain: true })
        });

    } catch (error) {
        console.error('Error fetching employee:', error);
        req.flash('error', 'Error loading employee details');
        res.redirect('/employee');
    }
};

// Create new employee
exports.create = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    
    try {
        const { 
            first_name, last_name, email, phone, 
            department, position, branch, status, notes 
        } = req.body;

        // Basic validation
        if (!first_name || !last_name || !email || !department || !status) {
            return res.status(400).render('employee/employee-form', {
                error: 'Please fill in all required fields',
                formData: req.body,
                departments: [],
                branches: [],
                statuses: ['active', 'inactive'],
                isEdit: false
            });
        }

        // Check if employee with email already exists
        const existingEmployee = await Employee.findOne({ 
            where: { email },
            transaction 
        });

        if (existingEmployee) {
            await transaction.rollback();
            return res.status(400).render('employee/employee-form', {
                error: 'An employee with this email already exists',
                formData: req.body,
                departments: [],
                branches: [],
                statuses: ['active', 'inactive'],
                isEdit: false
            });
        }

        // Generate employee ID
        const employeeId = await generateEmployeeId();

        // Create employee
        const employee = await Employee.create({
            employee_id: employeeId,
            first_name,
            last_name,
            email,
            phone: phone || null,
            department,
            position: position || null,
            branch: branch || null,
            status,
            notes: notes || null,
            hire_date: new Date()
        }, { transaction });

        await transaction.commit();
        
        return res.redirect(`/employee/${employee.id}?success=Employee created successfully`);
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating employee:', error);
        return res.status(500).render('employee/employee-form', {
            error: 'Error creating employee: ' + (error.errors ? error.errors[0].message : error.message),
            formData: req.body,
            departments: [],
            branches: [],
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
            department, position, branch, status, notes 
        } = req.body;

        // Basic validation
        if (!first_name || !last_name || !email || !department || !status) {
            return res.status(400).render('employee/employee-form', {
                error: 'Please fill in all required fields',
                employee: { id, ...req.body },
                departments: [],
                branches: [],
                statuses: ['active', 'inactive'],
                isEdit: true
            });
        }

        const employee = await Employee.findByPk(id, { transaction });
        
        if (!employee) {
            await transaction.rollback();
            return res.redirect('/employee?error=Employee not found');
        }

        // Check if email is being changed to an existing one
        if (email !== employee.email) {
            const emailExists = await Employee.findOne({ 
                where: { email },
                transaction 
            });

            if (emailExists) {
                await transaction.rollback();
                return res.status(400).render('employee/employee-form', {
                    error: 'An employee with this email already exists',
                    employee: { id, ...req.body },
                    departments: [],
                    branches: [],
                    statuses: ['active', 'inactive'],
                    isEdit: true
                });
            }
        }

        // Update employee
        await employee.update({
            first_name,
            last_name,
            email,
            phone: phone || null,
            department,
            position: position || null,
            branch: branch || null,
            status,
            notes: notes || null
        }, { transaction });

        await transaction.commit();
        
        return res.redirect(`/employee/${id}?success=Employee updated successfully`);
        
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
    const transaction = await db.sequelize.transaction();
    
    try {
        const { id } = req.params;
        
        // Find the employee first
        const employee = await Employee.findByPk(id, { transaction });
        
        if (!employee) {
            await transaction.rollback();
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }
            return res.redirect('/employee?error=Employee not found');
        }
        
        // Check if employee has active assignments
        const activeAssignments = await AssetAssignment.count({
            where: { 
                employee_id: id,
                status: 'assigned'
            },
            transaction
        });
        
        if (activeAssignments > 0) {
            await transaction.rollback();
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot delete employee with active asset assignments' 
                });
            }
            return res.redirect(`/employee/${id}?error=Cannot delete employee with active asset assignments`);
        }
        
        // Delete the employee
        await employee.destroy({ transaction });
        await transaction.commit();
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ 
                success: true, 
                message: 'Employee deleted successfully' 
            });
        }
        
        return res.redirect('/employee?success=Employee deleted successfully');
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting employee:', error);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error deleting employee',
                error: error.message 
            });
        }
        
        return res.redirect(`/employee/${req.params.id}?error=Error deleting employee: ${encodeURIComponent(error.message)}`);
    }
};

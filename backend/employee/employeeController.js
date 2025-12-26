const { Op } = require('sequelize');
const db = require('../models');
const Employee = db.Employee;

exports.list = async (req, res) => {
    try {
        const {
            department = '', 
            status = '', 
            branch = ''
        } = req.query;

        const whereClause = {};
        if (department) whereClause.department = department;
        if (status) whereClause.status = status;
        if (branch) whereClause.branch = branch;

        const employees = await Employee.findAll({
            where: whereClause,
            include: [{
                model: db.AssetAssignment,
                as: 'assignments',
                include: [{
                    model: db.Asset,
                    as: 'asset'
                }]
            }],
            order: [['first_name', 'ASC']]
        });

        // Get unique departments and branches for filters
        const departments = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']],
            where: { department: { [Op.ne]: null } },
            raw: true
        });

        const branches = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('branch')), 'branch']],
            where: { branch: { [Op.ne]: null } },
            raw: true
        });

        return res.render('employee/employee', {
            employee: employees.map(emp => emp.toJSON()),
            departments: departments.map(d => d.department),
            branches: branches.map(b => b.branch),
            department,
            status,
            branch
        });

    } catch (error) {
        console.error('Error fetching employees:', error);
        
        return res.status(500).render('employee/employee', {
            employee: [],
            departments: [],
            branches: [],
            error: 'Error fetching employees',
            message: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const employee = await Employee.findByPk(id, {
            include: [{
                model: db.AssetAssignment,
                as: 'assignments',
                include: [{
                    model: db.Asset,
                    as: 'asset'
                }]
            }]
        });
        
        if (!employee) {
            return res.status(404).render('employee/employee', {
                employee: [],
                departments: [],
                branches: [],
                error: 'Employee not found'
            });
        }

        // Get departments and branches for filters
        const departments = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']],
            where: { department: { [Op.ne]: null } },
            raw: true
        });

        const branches = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('branch')), 'branch']],
            where: { branch: { [Op.ne]: null } },
            raw: true
        });

        return res.render('employee/employee', {
            employee: employee ? [employee.toJSON()] : [],
            departments: departments.map(d => d.department),
            branches: branches.map(b => b.branch),
            department: req.query.department || '',
            status: req.query.status || '',
            branch: req.query.branch || ''
        });
        
    } catch (error) {
        console.error('Error fetching employee:', error);
        
        return res.status(500).render('employee/employee', {
            employee: [],
            departments: [],
            branches: [],
            department: req.query.department || '',
            status: req.query.status || '',
            branch: req.query.branch || '',
            error: 'Error fetching employee',
            message: error.message
        });
    }
};

exports.create = async (req, res) => {
    try {
        const employeeData = req.body;
        
        const employee = await Employee.create(employeeData);
        
        // Get all employees to display after creation
        const employees = await Employee.findAll({
            include: [{
                model: db.AssetAssignment,
                as: 'assignments',
                include: [{
                    model: db.Asset,
                    as: 'asset'
                }]
            }]
        });
        
        // Get departments and branches for filters
        const departments = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']],
            where: { department: { [Op.ne]: null } },
            raw: true
        });

        const branches = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('branch')), 'branch']],
            where: { branch: { [Op.ne]: null } },
            raw: true
        });
        
        return res.render('employee/employee', {
            employee: employees.map(emp => emp.toJSON()),
            departments: departments.map(d => d.department),
            branches: branches.map(b => b.branch),
            department: '',
            status: '',
            branch: '',
            message: 'Employee created successfully'
        });

    } catch (error) {
        console.error('Error creating employee:', error);
        
        return res.status(500).render('employee/employee', {
            employee: [],
            departments: [],
            branches: [],
            department: '',
            status: '',
            branch: '',
            error: 'Error creating employee',
            message: error.message
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const employeeData = req.body;

        const [updatedRowsCount] = await Employee.update(employeeData, { where: { id } });
        
        return updatedRowsCount === 0
            ? res.status(404).render('employee/employee', {
                success: false,
                error: 'Employee not found or no changes made'
              })
            : (async () => {
                const updatedEmployee = await Employee.findByPk(id);
                return res.json({
                    success: true,
                    data: updatedEmployee,
                    message: 'Employee updated successfully'
                });
            })();

    } catch (error) {
        console.error('Error updating employee:', error);
        
        return res.status(500).render('employee/employee', {
            success: false,
            error: 'Error updating employee',
            message: error.message
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedRowsCount = await Employee.destroy({ where: { id } });
        
        if (deletedRowsCount === 0) {
            return res.status(404).render('employee/employee', {
                employee: [],
                departments: [],
                branches: [],
                error: 'Employee not found'
            });
        }

        // Get remaining employees to display after deletion
        const employees = await Employee.findAll({
            include: [{
                model: db.AssetAssignment,
                as: 'assignments',
                include: [{
                    model: db.Asset,
                    as: 'asset'
                }]
            }]
        });
        
        // Get departments and branches for filters
        const departments = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('department')), 'department']],
            where: { department: { [Op.ne]: null } },
            raw: true
        });

        const branches = await Employee.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('branch')), 'branch']],
            where: { branch: { [Op.ne]: null } },
            raw: true
        });
        
        return res.render('employee/employee', {
            employee: employees.map(emp => emp.toJSON()),
            departments: departments.map(d => d.department),
            branches: branches.map(b => b.branch),
            department: '',
            status: '',
            branch: '',
            message: 'Employee deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting employee:', error);
        return res.status(500).render('employee/employee', {
            employee: [],
            departments: [],
            branches: [],
            department: '',
            status: '',
            branch: '',
            error: 'Error deleting employee',
            message: error.message
        });
    }
};

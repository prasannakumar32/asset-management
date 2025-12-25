const { Op } = require('sequelize');
const db = require('../models');
const Employee = db.Employee;

exports.list = async (req, res) => {
    try {
        const { 
            search = '', 
            department = '', 
            status = '', 
            branch = '',
            sortBy = 'first_name',
            sortOrder = 'ASC'
        } = req.query;

        const whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { first_name: { [Op.like]: `%${search}%` } },
                { last_name: { [Op.like]: `%${search}%` } },
                { employee_id: { [Op.like]: `%${search}%` } }
            ];
        }

        if (department) whereClause.department = department;
        if (status) whereClause.status = status;
        if (branch) whereClause.branch = branch;

        const employees = await Employee.findAll({
            where: whereClause,
            order: [[sortBy, sortOrder.toUpperCase()]],
            raw: true
        });

        return res.json({
            success: true,
            data: {
                employees
            }
        });

    } catch (error) {
        console.error('Error fetching employees:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error fetching employees',
            message: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const employee = await Employee.findByPk(id);
        
        if (!employee) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found'
            });
        }
        
        return res.json({
            success: true,
            data: employee
        });
        
    } catch (error) {
        console.error('Error fetching employee:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error fetching employee',
            message: error.message
        });
    }
};

exports.create = async (req, res) => {
    try {
        const employeeData = req.body;
        
        const employee = await Employee.create(employeeData);
        
        return res.status(201).json({
            success: true,
            data: employee,
            message: 'Employee created successfully'
        });

    } catch (error) {
        console.error('Error creating employee:', error);
        
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
        const employeeData = req.body;

        const [updatedRowsCount] = await Employee.update(employeeData, { where: { id } });
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found'
            });
        }

        const updatedEmployee = await Employee.findByPk(id);
        
        return res.json({
            success: true,
            data: updatedEmployee,
            message: 'Employee updated successfully'
        });

    } catch (error) {
        console.error('Error updating employee:', error);
        
        return res.status(500).json({
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
            return res.status(404).json({
                success: false,
                error: 'Employee not found'
            });
        }
        
        return res.json({
            success: true,
            message: 'Employee deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting employee:', error);
        return res.status(500).json({
            success: false,
            error: 'Error deleting employee',
            message: error.message
        });
    }
};

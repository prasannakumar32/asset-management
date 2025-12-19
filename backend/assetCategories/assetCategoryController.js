const { Op } = require('sequelize');
const db = require('../models');
const AssetCategory = db.AssetCategory;

exports.list = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = 'active',
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }
        if (status === 'active') {
            whereClause.is_active = true;
        } else if (status === 'inactive') {
            whereClause.is_active = false;
        }
        const { count, rows: categories } = await AssetCategory.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[sortBy, sortOrder.toUpperCase()]]
        });

        const totalPages = Math.ceil(count / limit);

        return res.json({
            success: true,
            data: {
                categories,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error fetching categories',
            message: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await AssetCategory.findByPk(id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        return res.json({
            success: true,
            data: category
        });
        
    } catch (error) {
        console.error('Error fetching category:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error fetching category',
            message: error.message
        });
    }
};

exports.create = async (req, res) => {
    try {
        const categoryData = req.body;
        const category = await AssetCategory.create(categoryData);
        return res.status(201).json({
            success: true,
            data: category,
            message: 'Category created successfully'
        });
    } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json({
            success: false,
            error: 'Error creating category',
            message: error.message
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const categoryData = req.body;
        const [updatedRowsCount] = await AssetCategory.update(categoryData, { where: { id } });
        if (updatedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        const updatedCategory = await AssetCategory.findByPk(id);
        return res.json({
            success: true,
            data: updatedCategory,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({
            success: false,
            error: 'Error updating category',
            message: error.message
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRowsCount = await AssetCategory.destroy({ where: { id } });     
        if (deletedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        return res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);  
        return res.status(500).json({
            success: false,
            error: 'Error deleting category',
            message: error.message
        });
    }
};

const { Op } = require('sequelize');
const db = require('../models');
const AssetCategory = db.AssetCategory;

exports.list = async (req, res) => {
    try {
        const { 
            status = 'active',
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;
        whereClause.is_active = status === 'active' ? true : status === 'inactive' ? false : undefined;
        const categories = await AssetCategory.findAll({
            where: whereClause,
            order: [[sortBy, sortOrder.toUpperCase()]]
        });

        return res.json({
            success: true,
            data: {
                categories
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
        
        return !category 
            ? res.status(404).json({
                success: false,
                error: 'Category not found'
              })
            : res.json({
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
        return updatedRowsCount === 0
            ? res.status(404).json({
                success: false,
                error: 'Category not found or no changes made'
              })
            : (async () => {
                const updatedCategory = await AssetCategory.findByPk(id);
                return res.json({
                    success: true,
                    data: updatedCategory,
                    message: 'Category updated successfully'
                });
            })();
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

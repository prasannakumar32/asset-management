const { Op } = require('sequelize');
const db = require('../models');
const AssetCategory = db.AssetCategory;

// Show asset categories page 
exports.showCategoryPage = async (req, res) => {
    try {
        const { status = 'active' } = req.query;
        const whereClause = {};
        whereClause.is_active = status === 'active' ? true : status === 'inactive' ? false : undefined;
        
        const categories = await AssetCategory.findAll({
            where: whereClause,
            order: [['name', 'ASC']]
        });

        res.render('asset-categories/asset-categories', {
            categories,
            status,
            title: 'Asset Categories'
        });
    } catch (error) {
        console.error('Error fetching categories for page:', error);
        res.status(500).render('error', { 
            message: 'Error loading asset categories',
            error: error.message 
        });
    }
};

// Show category form 
exports.showCategoryForm = async (req, res) => {
    try {
        const { id } = req.params;
        let category = null;
        
        if (id) {
            category = await AssetCategory.findByPk(id);
            if (!category) {
                return res.status(404).render('error', { 
                    message: 'Category not found',
                    error: 'The requested category does not exist'
                });
            }
        }

        res.render('asset-categories/asset-category-form', {
            category,
            title: id ? 'Edit Category' : 'Add New Category',
            isEdit: !!id
        });
    } catch (error) {
        console.error('Error showing category form:', error);
        res.status(500).render('error', { 
            message: 'Error loading category form',
            error: error.message 
        });
    }
};

// View single category
exports.viewCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await AssetCategory.findByPk(id);
        
        if (!category) {
            return res.status(404).render('error', { 
                message: 'Category not found',
                error: 'The requested category does not exist'
            });
        }

        res.render('asset-categories/asset-category-view', {
            category,
            title: 'Category Details'
        });
    } catch (error) {
        console.error('Error viewing category:', error);
        res.status(500).render('error', { 
            message: 'Error loading category details',
            error: error.message 
        });
    }
};

exports.list = async (req, res) => {
    try {
        const { 
            status = 'active',
        } = req.query;
        const whereClause = {};
        whereClause.is_active = status === 'active' ? true : status === 'inactive' ? false : undefined;
        const categories = await AssetCategory.findAll({
            where: whereClause,
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
        // Only extract the fields we want to allow
        const { name, description } = req.body;
        const is_active = req.body.is_active === 'true' || req.body.is_active === true;
        
        // Create the category with only the allowed fields
        const category = await AssetCategory.create({
            name: name.trim(),
            description: description ? description.trim() : null,
            is_active
        });

        // For form submissions, redirect to the categories list
        req.session.message = { type: 'success', text: 'Category created successfully' };
        return res.redirect('/asset-categories');
    } catch (error) {
        console.error('Error creating category:', error);
        
        // Handle unique constraint violation
        if (error.name === 'SequelizeUniqueConstraintError') {
            req.session.message = { type: 'error', text: 'A category with this name already exists. Please choose a different name.' };
        } else {
            req.session.message = { type: 'error', text: `Error creating category: ${error.message}` };
        }
        
        // Store the form data to repopulate the form
        req.session.formData = req.body;
        return res.redirect(req.get('Referrer') || '/asset-categories/form');
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
        const transaction = await db.sequelize.transaction();
        try {
            await AssetCategory.destroy({ 
                where: { id },
                transaction 
            });   
            await transaction.commit();
            return res.redirect('/asset-categories');
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).render('error', { 
            message: 'Error deleting category',
            error: error.message 
        });
    }
};

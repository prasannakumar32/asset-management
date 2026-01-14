const { Op } = require('sequelize');
const db = require('../models');
const AssetCategory = db.AssetCategory;

// Show asset categories page 
exports.showCategoryPage = async (req, res) => {
    try {
        const { status = '' } = req.query;
        
        res.render('asset-categories/asset-categories', {
            status,
            title: 'Asset Categories',
            currentPage: 'asset-categories',
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error rendering categories page:', error);
        res.redirect('/dashboard');
    }
};

// API endpoint for categories
exports.listAPI = async (req, res) => {
    try {
        const { status = '' } = req.query;
        const whereClause = {};
        if (status === 'active') {
            whereClause.is_active = true;
        } else if (status === 'inactive') {
            whereClause.is_active = false;
        }
        
        const categories = await AssetCategory.findAll({
            where: whereClause,
            order: [['name', 'ASC']]
        });

        res.json({ success: true, data: { categories } });
    } catch (error) {
        console.error('Error fetching categories API:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching categories',
            message: error.message
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
                return res.redirect('/asset-categories');
            }
        }
        res.render('asset-categories/asset-category-form', {
            category,
            title: id ? 'Edit Category' : 'Add New Category',
            currentPage: 'asset-categories',
            isEdit: !!id,
            error: req.query.error,
            success: req.query.success,
            formData: req.query.error ? req.query : {}
        });
    } catch (error) {
        console.error('Error showing category form:', error);
        res.redirect('/asset-categories');
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
            title: 'Category Details',
            currentPage: 'asset-categories'
        });
    } catch (error) {
        console.error('Error viewing category:', error);
        res.status(500).render('error', { 
            message: 'Error loading category details',
            error: error.message 
        });
    }
};

//create category 
exports.create = async (req, res) => {
    try {
        const { name, description } = req.body;
        const is_active = req.body.is_active === 'true' || req.body.is_active === true;
        
        const category = await AssetCategory.create({
            name: name.trim(),
            description: description ? description.trim() : null,
            is_active
        });

        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');

        if (isApiRequest) {
            return res.json({ 
                success: true, 
                message: 'Category created successfully',
                data: { category }
            });
        }

        return res.redirect('/asset-categories?success=Category created successfully');
    } catch (error) {
        console.error('Error creating category:', error);
        
        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');

        if (isApiRequest) {
            return res.status(500).json({
                success: false,
                error: 'Error creating category',
                message: error.message
            });
        }
        
        res.redirect('/asset-categories?error=Error creating category');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const categoryData = req.body;
        
        // Process the is_active field properly
        if (categoryData.is_active !== undefined) {
            categoryData.is_active = categoryData.is_active === 'true' || categoryData.is_active === true;
        }
        
        const [updatedRowsCount] = await AssetCategory.update(categoryData, { where: { id } });
        
        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');
        
        if (updatedRowsCount === 0) {
            if (isApiRequest) {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            return res.redirect('/asset-categories');
        }
        
        // Check if this is an API request
        if (isApiRequest) {
            const updatedCategory = await AssetCategory.findByPk(id);
            return res.json({
                success: true,
                message: 'Category updated successfully',
                data: { category: updatedCategory }
            });
        }
        
        // Redirect to categories list
        return res.redirect('/asset-categories');
    } catch (error) {
        console.error('Error updating category:', error);
        
        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');
        
        if (isApiRequest) {
            return res.status(500).json({
                success: false,
                error: 'Error updating category',
                message: error.message
            });
        }
        
        return res.redirect(`/asset-categories/${id}/form`);
    }
};

exports.delete = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');
        
        const category = await AssetCategory.findByPk(id, { transaction });
        
        if (!category) {
            await transaction.rollback();
            if (isApiRequest) {
                return res.status(404).json({ success: false, error: 'Category not found' });
            }
            return res.redirect('/asset-categories?error=Category not found');
        }
        
        await AssetCategory.destroy({ 
            where: { id },
            transaction 
        });   
        await transaction.commit();
        
        if (isApiRequest) {
            return res.json({ success: true, message: 'Category deleted successfully' });
        }
        
        return res.redirect('/asset-categories?success=Category deleted successfully');
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting category:', error);
        const errorMessage = error.message.includes('foreign key constraint') 
            ? 'Cannot delete category: It has related records that could not be removed' 
            : 'Error deleting category: ' + error.message;
            
        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');
        
        if (isApiRequest) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
            
        return res.status(500).render('error', { 
            message: 'Error deleting category',
            error: error.message 
        });
    }
};

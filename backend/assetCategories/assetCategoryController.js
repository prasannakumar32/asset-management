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
            title: 'Asset Categories',
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error fetching categories for page:', error);
        res.redirect('/dashboard');
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

        return res.redirect('/asset-categories?success=Category created successfully');
    } catch (error) {
        console.error('Error creating category:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.redirect('/asset-categories/form?error=Category name already exists');
        } else if (error.name === 'SequelizeValidationError') {
            const errorMessage = error.errors.map(e => e.message).join(', ');
            return res.redirect(`/asset-categories/form?error=${encodeURIComponent(errorMessage)}`);
        } else {
            return res.redirect('/asset-categories/form?error=' + encodeURIComponent(error.message));
        }
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
        
        if (updatedRowsCount === 0) {
            return res.redirect('/asset-categories');
        }
        
        // Redirect to categories list
        return res.redirect('/asset-categories');
    } catch (error) {
        console.error('Error updating category:', error);
        return res.redirect(`/asset-categories/${id}/form`);
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

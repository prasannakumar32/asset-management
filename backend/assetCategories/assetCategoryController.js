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
        else if (status === '') {
            whereClause.is_active = true;
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
        
        // Validate required fields
        const fieldErrors = {};
        if (!name || name.trim() === '') {
            fieldErrors.name = 'Category name is required';
        }
        if (!description || description.trim() === '') {
            fieldErrors.description = 'Description is required';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                fieldErrors
            });
        }

        // Check for duplicate category name
        const existingCategory = await AssetCategory.findOne({
            where: { 
                name: name.trim()
            }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Category name already exists',
                fieldErrors: {
                    name: 'Category name already exists'
                }
            });
        }

        const category = await AssetCategory.create({
            name: name.trim(),
            description: description ? description.trim() : null,
            is_active
        });

        return res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { category }
        });
    } catch (error) {
        console.error('Error creating category:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const fieldErrors = {};
            error.errors.forEach(err => {
                fieldErrors[err.path] = err.message;
            });
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                fieldErrors
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'Category name already exists',
                fieldErrors: {
                    name: 'Category name already exists'
                }
            });
        }
        
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
        
        // Validate required fields
        const fieldErrors = {};
        if (!categoryData.name || categoryData.name.trim() === '') {
            fieldErrors.name = 'Category name is required';
        }
        if (!categoryData.description || categoryData.description.trim() === '') {
            fieldErrors.description = 'Description is required';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                fieldErrors
            });
        }
        
        // Process the is_active field properly
        if (categoryData.is_active !== undefined) {
            categoryData.is_active = categoryData.is_active === 'true' || categoryData.is_active === true;
        }
        
        // Check for duplicate category name (excluding current category)
        const existingCategory = await AssetCategory.findOne({
            where: { 
                name: categoryData.name.trim(),
                id: { [Op.ne]: parseInt(id) }
            }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'Category name already exists',
                fieldErrors: {
                    name: 'Category name already exists'
                }
            });
        }
        
        const [updatedRowsCount] = await AssetCategory.update(categoryData, { where: { id } });
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }
        
        // Get updated category to return in API response
        const updatedCategory = await AssetCategory.findByPk(id);
        
        return res.json({
            success: true,
            message: 'Category updated successfully',
            data: { category: updatedCategory }
        });
    } catch (error) {
        console.error('Error updating category:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const fieldErrors = {};
            error.errors.forEach(err => {
                fieldErrors[err.path] = err.message;
            });
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                fieldErrors
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'Category name already exists',
                fieldErrors: {
                    name: 'Category name already exists'
                }
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'Error updating category',
            message: error.message
        });
    }
};

exports.delete = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
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
        
        return res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting category:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const fieldErrors = {};
            error.errors.forEach(err => {
                fieldErrors[err.path] = err.message;
            });
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                fieldErrors
            });
        }
        
        // Handle foreign key constraint errors
        const errorMessage = error.message.includes('foreign key constraint') 
            ? 'Cannot delete category: It has related records that could not be removed' 
            : 'Error deleting category: ' + error.message;
            
        return res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
};

// Get category by ID for API
exports.getCategoryById = async (req, res) => {
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
            data: { category }
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

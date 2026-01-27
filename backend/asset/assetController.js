const { Op } = require('sequelize');
const db = require('../models');
const { Asset, AssetHistory, AssetCategory } = db;

// Helper functions for form data and options
const getFormData = (req) => {
    const formData = {};
    for (const key in req.body) {
        formData[key] = req.body[key];
    }
    formData.is_active = formData.is_active ? 'true' : 'false';
    return formData;
};
const getFormOptions = async () => {
    const categories = await AssetCategory.findAll({ 
        where: { is_active: true },
        order: [['name', 'ASC']]
    });
    const branches = await Asset.findAll({
        attributes: ['branch'],
        where: { branch: { [Op.ne]: null } },
        order: [['branch', 'ASC']],
    });

    return {
        categories: categories,
        branches: branches
    };
};

const parseAssetData = (assetData) => {
    const numericFields = ['warranty_months', 'purchase_cost', 'current_value', 'category_id'];
    numericFields.forEach(field => {
        assetData[field] && assetData[field].trim() !== '' 
            ? assetData[field] = field === 'category_id' ? parseInt(assetData[field]) : parseFloat(assetData[field])
            : assetData[field] = null;
    });
// Convert boolean
    assetData.is_active = assetData.is_active === 'true';
    return assetData;
};

const generateAssetTag = async () => {
    const lastAsset = await Asset.findOne({
        attributes: ['asset_tag'],
        order: [['asset_tag', 'DESC']],
        limit: 1
    });
    
    let lastId = 0;
    lastAsset && lastAsset.asset_tag 
        ? (() => {
            const match = lastAsset.asset_tag.match(/\d+/);
            if (match) lastId = parseInt(match[0]);
        })()
        : null;
    
    return `AST${String(lastId + 1).padStart(4, '0')}`;
};

const renderFormWithError = async (res, isEdit, error, formData, asset) => {
    const options = await getFormOptions();
    
    return res.render('asset/asset-form', {
        isEdit: isEdit,
        asset: asset,
        categories: options.categories,
        branches: options.branches,
        currentPage: 'assets',
        formData: formData || getFormData(res.req),
        error: error
    });
};

//show asset form for edit and create 
exports.showAssetForm = async (req, res) => {
    try {
        const { id } = req.params;
        const isEdit = !!id;
        const options = await getFormOptions();
        
        let asset = null;
        if (isEdit) {
            asset = await Asset.findByPk(id, {
                include: [{ model: db.AssetCategory, as: 'category', attributes: ['id', 'name'] }]
            });
            if (!asset) {
                return res.status(404).render('error', { error: 'Asset not found' });
            }
        }
        
        return res.render('asset/asset-form', {
            title: isEdit ? 'Edit Asset' : 'Create Asset',
            currentPage: 'assets',
            isEdit: isEdit,
            asset: asset,
            categories: options.categories,
            branches: options.branches
        });
    } catch (error) {
        console.error('Error loading asset form:', error);
        return res.status(500).render('error', { error: 'Error loading asset form' });
    }
};

// Show assets page (UI)
exports.list = async (req, res) => {
    try {
        const options = await getFormOptions();
        return res.render('asset/asset', {
            title: 'Assets',
            currentPage: 'assets',
            categories: options.categories,
            branches: options.branches
        });
    } catch (error) {
        console.error('Error rendering asset page:', error);
        return res.status(500).render('error', { error: 'Error loading assets page' });
    }
};

// API endpoint for assets list
exports.listAPI = async (req, res) => {
    try {
        const { 
            category = '', 
            status = '', 
            is_active = '', 
            branch = ''
        } = req.query;
        
        const whereClause = {};
        
        //build where clause  
        category ? whereClause.category_id = parseInt(category) : null;
        status ? whereClause.status = status : null;
        branch ? whereClause.branch = { [Op.in]: branch.split(',').map(b => b.trim()).filter(Boolean) } : null;
        is_active !== '' ? whereClause.is_active = is_active === 'true' : null;

        const assets = await Asset.findAll({
            where: whereClause,
            include: [{ 
                model: db.AssetCategory, 
                as: 'category', 
                attributes: ['id', 'name'] 
            }],
            order: [['created_at', 'DESC']]
        });

        return res.json({ success: true, data: { assets } });
        
    } catch (error) {
        console.error('Error in listAPI function:', error);
        return res.status(500).json({
            success: false,
            error: 'Error fetching assets',
            message: error.message
        });
    }
};

exports.viewAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Asset.findByPk(id, {
            include: [{ model: db.AssetCategory, as: 'category', attributes: ['id', 'name'] }]
        });
        
        if (!asset) {
            return res.status(404).render('error', { error: 'Asset not found' });
        }
        
        return res.render('asset/asset-view', {
            title: 'Asset Details',
            currentPage: 'assets',
            asset: asset
        });
    } catch (error) {
        console.error('Error viewing asset:', error);
        return res.status(500).render('error', { error: 'Error fetching asset' });
    }
};

exports.create = async (req, res) => {
    try {
        let assetData = parseAssetData(req.body);
        
        if (!assetData.asset_tag || assetData.asset_tag.trim() === '') {
            assetData.asset_tag = await generateAssetTag();
        } else {
            const existingAsset = await Asset.findOne({
                where: { asset_tag: assetData.asset_tag.trim() }
            });
            if (existingAsset) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Asset tag already exists. Please use a different tag or leave empty to auto-generate.',
                    fieldErrors: {
                        asset_tag: 'Asset tag already exists'
                    }
                });
            }
        }
        
        // Check duplicate serial number
        if (assetData.serial_number && assetData.serial_number.trim() !== '') {
            const existingAsset = await Asset.findOne({
                where: { serial_number: assetData.serial_number.trim() }
            });
            if (existingAsset) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Serial number already exists. Please use a different serial number or leave empty.',
                    fieldErrors: {
                        serial_number: 'Serial number already exists'
                    }
                });
            }
        }
        
        // Create asset with transaction
        const transaction = await db.sequelize.transaction();
        try {
            const asset = await Asset.create(assetData, { transaction });
            await AssetHistory.create({
                asset_id: asset.id,
                action_type: 'created',
                action_date: new Date(),
                notes: `Asset created with status: ${assetData.status}`
            }, { transaction });
            
            await transaction.commit();
            
            return res.status(201).json({ 
                success: true, 
                message: 'Asset created successfully',
                data: { asset }
            });
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('Error creating asset:', error);
        
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
            let field, message;
            if (error.errors[0].path === 'asset_tag') {
                field = 'asset_tag';
                message = 'Asset tag already exists';
            } else if (error.errors[0].path === 'serial_number') {
                field = 'serial_number';
                message = 'Serial number already exists';
            } else {
                field = error.errors[0].path;
                message = `${field} already exists`;
            }
            
            return res.status(400).json({
                success: false,
                error: message,
                fieldErrors: {
                    [field]: message
                }
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            error: 'Error creating asset',
            message: error.message 
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        let assetData = parseAssetData(req.body);
        
//remove asset_tag from update data 
        delete assetData.asset_tag;
// Check duplicate serial number
        if (assetData.serial_number && assetData.serial_number.trim() !== '') {
            const existingAsset = await Asset.findOne({
                where: {  
                    serial_number: assetData.serial_number.trim(),
                    id: { [Op.ne]: parseInt(id) }
                }
            });
            if (existingAsset) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Serial number already exists. Please use a different serial number.',
                    fieldErrors: {
                        serial_number: 'Serial number already exists'
                    }
                });
            }
        }
        
// Update asset
        const [updatedRowsCount] = await Asset.update(assetData, { where: { id } });
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
// Create history record
        await AssetHistory.create({
            asset_id: parseInt(id),
            action_type: 'updated',
            action_date: new Date()
        });
        
// Get updated asset to return in API response
        const updatedAsset = await Asset.findByPk(id);
        
        return res.json({ 
            success: true, 
            message: 'Asset updated successfully',
            data: { asset: updatedAsset }
        });
        
    } catch (error) {
        console.error('Error updating asset:', error);
        
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
        
        return res.status(500).json({ 
            success: false, 
            error: 'Error updating asset',
            message: error.message 
        });
    }
};

exports.delete = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
        const asset = await Asset.findByPk(id, { transaction });
        if (!asset) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
// Delete related records in order
        await db.AssetAssignment.destroy({ where: { asset_id: id }, transaction });
        await db.AssetHistory.destroy({ where: { asset_id: id }, transaction });
        await Asset.destroy({ where: { id }, transaction });
        
        await transaction.commit();
        
        return res.json({ success: true, message: 'Asset deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting asset:', error);
        const errorMessage = error.message.includes('foreign key constraint') 
            ? 'Cannot delete asset: It has related records that could not be removed' 
            : 'Error deleting asset: ' + error.message;
            
        return res.status(500).json({ success: false, error: errorMessage });
    }
};

exports.getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Asset.findByPk(id, {
            include: [{ model: db.AssetCategory, as: 'category', attributes: ['id', 'name'] }]
        });
        
        if (!asset) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
        res.json({ success: true, data: { asset } });
    } catch (error) {
        console.error('Error fetching asset:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching asset',
            message: error.message
        });
    }
};

exports.getFormOptions = async (req, res) => {
    try {
        const options = await getFormOptions();
        res.json({ success: true, data: options });
    } catch (error) {
        console.error('Error fetching form options:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching form options',
            message: error.message
        });
    }
};

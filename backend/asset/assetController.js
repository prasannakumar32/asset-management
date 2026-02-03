const { Op } = require('sequelize');
const db = require('../models');
const { Asset, AssetHistory, AssetCategory } = db;
const sequelize = db.sequelize;

// Helper functions for form data and options
const getFormData = (req) => {
    const formData = {};
    for (const key in req.body) {
        formData[key] = req.body[key];
    }
    formData.is_active = formData.is_active ? true : false;
    return formData;
};
const getFormOptions = async () => {
    const categories = await AssetCategory.findAll({ 
        where: { is_active: true },
        order: [['name', 'ASC']],
        raw: true
    });
    
    const branches = await Asset.findAll({
        attributes: ['branch'],
        order: [['branch', 'ASC']],
        raw: true
    });

    // Get unique branches
    const uniqueBranches = [...new Set(branches.map(b => b.branch).filter(branch => branch && branch.trim() !== ''))];

    return { categories, branches: uniqueBranches };
};

const parseAssetData = (assetData) => {
    const numericFields = ['warranty_months', 'purchase_cost', 'current_value'];
    numericFields.forEach(field => {
        assetData[field] && assetData[field].trim() !== '' 
            ? assetData[field] = (field === 'warranty_months') ? parseInt(assetData[field]) : parseFloat(assetData[field])
            : assetData[field] = null;
    });
    
    // Handle category_id separately
    if (assetData.category_id && assetData.category_id.trim() !== '') {
        assetData.category_id = parseInt(assetData.category_id);
    }
// Convert boolean
    assetData.is_active = assetData.is_active === 'true';
    
   //branch first letter capital and other in small letter
    if (assetData.branch && assetData.branch.trim() !== '') {
        assetData.branch = assetData.branch.charAt(0).toUpperCase() + assetData.branch.slice(1).toLowerCase();
    }
    
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

// Show assets page
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

// api endpoint for assets list
exports.listAPI = async (req, res) => {
    try {
        const { 
            category = '', 
            status = '', 
            is_active = 'true', 
            branch = ''
        } = req.query;
        
        const whereClause = {};
        
        // Build where clause  
        category ? whereClause.category_id = parseInt(category) : null;
        status ? whereClause.status = status : null;
        branch ? whereClause.branch = branch : null;
        whereClause.is_active = is_active === 'true';

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
        
        delete assetData.asset_tag;
        
        const originalAsset = await Asset.findByPk(id);
        if (!originalAsset) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
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
        
        const [updatedRowsCount] = await Asset.update(assetData, { where: { id } });
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
        // Track actual changes only
        const changes = {};
        Object.keys(req.body).forEach(key => {
            if (key !== 'asset_tag' && key !== '_csrf' && originalAsset[key] !== undefined) {
                const newVal = req.body[key];
                const oldVal = originalAsset[key];
                
                if (newVal && (typeof newVal !== 'string' || newVal.trim())) {
                    const normNew = newVal.toString().trim();
                    const normOld = oldVal ? oldVal.toString().trim() : '';
                    
                    if (normOld !== normNew) {
                        changes[key] = { from: normOld, to: normNew };
                    }
                }
            }
        });
        
        if (!Object.keys(changes).length) {
            return res.json({ 
                success: true, 
                message: 'Asset updated successfully',
                data: { asset: await Asset.findByPk(id) }
            });
        }
        
        await AssetHistory.create({
            asset_id: parseInt(id),
            action_type: 'updated',
            action_date: new Date(),
            previous_values: Object.fromEntries(Object.keys(changes).map(k => [k, changes[k].from])),
            new_values: Object.fromEntries(Object.keys(changes).map(k => [k, changes[k].to])),
            notes: `Updated fields: ${Object.keys(changes).join(', ')}`
        });
        
        return res.json({ success: true, message: 'Asset updated successfully', data: { asset: await Asset.findByPk(id) } });
        
    } catch (error) {
        console.error('Error updating asset:', error);
        
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

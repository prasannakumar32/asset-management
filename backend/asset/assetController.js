const { Op } = require('sequelize');
const db = require('../models');
const { Asset, AssetHistory, AssetCategory } = db;

// Helper functions for form data and options
const getFormData = (req) => {
    const formData = { ...req.body };
    formData.is_active = formData.is_active ? 'true' : 'false';
    return formData;
};
const getFormOptions = async () => {
    const categories = await AssetCategory.findAll({ 
        where: { is_active: true },
        order: [['name', 'ASC']]
    });
    const branches = await Asset.findAll({
        attributes: [
            [db.Sequelize.fn('DISTINCT', db.Sequelize.col('branch')), 'branch']
        ],
        where: { branch: { [Op.ne]: null } },
        order: [['branch', 'ASC']],
        raw: true
    });

    return {
        categories,
        branches: branches.map(b => b.branch).filter(b => b)
    };
};

const parseAssetData = (assetData) => {
    const numericFields = ['warranty_months', 'purchase_cost', 'current_value', 'category_id'];
    numericFields.forEach(field => {
        if (assetData[field] && assetData[field].trim() !== '') {
            assetData[field] = field === 'category_id' ? parseInt(assetData[field]) : parseFloat(assetData[field]);
        } else {
            assetData[field] = null;
        }
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
    if (lastAsset && lastAsset.asset_tag) {
        const match = lastAsset.asset_tag.match(/\d+/);
        if (match) lastId = parseInt(match[0]);
    }
    
    return `AST${String(lastId + 1).padStart(4, '0')}`;
};

const renderFormWithError = async (res, isEdit, error, formData = null, asset = null) => {
    const options = await getFormOptions();
    
    return res.render('asset/asset-form', {
        isEdit,
        asset,
        ...options,
        currentPage: 'assets',
        formData: formData || getFormData(res.req),
        error
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
            if (!asset) return res.redirect('/assets');
        }
        
        res.render('asset/asset-form', {
            isEdit,
            asset,
            ...options,
            currentPage: 'assets'
        });
    } catch (error) {
        console.error('Error loading asset form:', error);
        const options = await getFormOptions();
        res.render('asset/asset-form', {
            isEdit: !!req.params.id,
            asset: null,
            ...options,
            currentPage: 'assets'
        });
    }
};

exports.list = async (req, res) => {
    res.render('asset/asset', {
        currentPage: 'assets'
    });
};

exports.viewAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Asset.findByPk(id, {
            include: [{ model: db.AssetCategory, as: 'category', attributes: ['id', 'name'] }]
        });
        
        if (!asset) return res.redirect('/assets');
        
        res.render('asset/asset-view', {
            asset,
            currentPage: 'assets'
        });
    } catch (error) {
        console.error('Error viewing asset:', error);
        res.redirect('/assets');
    }
};

exports.create = async (req, res) => {
    try {
        let assetData = parseAssetData(req.body);
        
// Handle asset tag
        if (!assetData.asset_tag || assetData.asset_tag.trim() === '') {
            assetData.asset_tag = await generateAssetTag();
        } else {
            const existingAsset = await Asset.findOne({
                where: { asset_tag: assetData.asset_tag.trim() }
            });
            if (existingAsset) {
                return renderFormWithError(res, false, 
                    'Asset tag already exists. Please use a different tag or leave empty to auto-generate.');
            }
        }
        
// Check duplicate serial number
        if (assetData.serial_number && assetData.serial_number.trim() !== '') {
            const existingAsset = await Asset.findOne({
                where: { serial_number: assetData.serial_number.trim() }
            });
            if (existingAsset) {
                return renderFormWithError(res, false, 
                    'Serial number already exists. Please use a different serial number or leave empty.');
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
            res.redirect('/assets');
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('Error creating asset:', error);
        const errorMessage = error.name === 'SequelizeValidationError' 
            ? error.errors.map(e => e.message).join(', ')
            : error.name === 'SequelizeUniqueConstraintError'
            ? 'Asset tag already exists'
            : error.message;
            
        renderFormWithError(res, false, errorMessage);
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        let assetData = parseAssetData(req.body);
        
// Don't allow updating certain fields
        delete assetData.asset_tag;
        delete assetData.current_assignment;
        delete assetData.currently_assigned_to;
        
// Check duplicate serial number (excluding current asset)
        if (assetData.serial_number && assetData.serial_number.trim() !== '') {
            const existingAsset = await Asset.findOne({
                where: { 
                    serial_number: assetData.serial_number.trim(),
                    id: { [Op.ne]: parseInt(id) }
                }
            });
            if (existingAsset) {
                const currentAsset = await Asset.findByPk(id);
                return renderFormWithError(res, true, 
                    'Serial number already exists. Please use a different serial number.', 
                    getFormData(req), currentAsset);
            }
        }
        
// Update asset
        await Asset.update(assetData, { where: { id } });
        
// Create history record
        await AssetHistory.create({
            asset_id: parseInt(id),
            action_type: 'updated',
            action_date: new Date()
        });
        
        res.redirect('/assets');
    } catch (error) {
        console.error('Error updating asset:', error);
        const errorMessage = error.name === 'SequelizeValidationError' 
            ? error.errors.map(e => e.message).join(', ')
            : error.name === 'SequelizeUniqueConstraintError'
            ? 'Asset tag already exists'
            : error.message;
            
        const currentAsset = await Asset.findByPk(req.params.id);
        renderFormWithError(res, true, errorMessage, getFormData(req), currentAsset);
    }
};

exports.delete = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        
        const asset = await Asset.findByPk(id, { transaction });
        if (!asset) {
            await transaction.rollback();
            // Check if this is an API request
            const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');
            
            if (isApiRequest) {
                return res.status(404).json({ success: false, error: 'Asset not found' });
            }
            return res.redirect('/assets');
        }
        
        // Delete related records in order
        await db.AssetAssignment.destroy({ where: { asset_id: id }, transaction });
        await db.AssetHistory.destroy({ where: { asset_id: id }, transaction });
        await Asset.destroy({ where: { id }, transaction });
        
        await transaction.commit();
        
        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');
        
        if (isApiRequest) {
            return res.json({ success: true, message: 'Asset deleted successfully' });
        }
        
        res.redirect('/assets');
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting asset:', error);
        const errorMessage = error.message.includes('foreign key constraint') 
            ? 'Cannot delete asset: It has related records that could not be removed' 
            : 'Error deleting asset: ' + error.message;
            
        // Check if this is an API request
        const isApiRequest = req.originalUrl && req.originalUrl.includes('/api/');
        
        if (isApiRequest) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        
        res.redirect('/assets');
    }
};

exports.listAPI = async (req, res) => {
    try {
        const { category = '', status = '', is_active = '', branch = '' } = req.query;
        const whereClause = {};

// Build where clause (same logic as list function)
        if (category) {
            if (!isNaN(category)) {
                whereClause.category_id = parseInt(category);
            } else {
                const foundCategory = await db.AssetCategory.findOne({
                    where: { name: category, is_active: true },
                    raw: true
                });
                if (foundCategory) whereClause.category_id = foundCategory.id;
            }
        }

        if (status) whereClause.status = status;
        if (branch) whereClause.branch = { [Op.in]: branch.split(',').map(b => b.trim()).filter(Boolean) };
        if (is_active !== '') whereClause.is_active = is_active === 'true';

        const assets = await Asset.findAll({
            where: whereClause,
            include: [{ model: db.AssetCategory, as: 'category', attributes: ['id', 'name'] }]
        });

        res.json({ success: true, data: { assets } });
    } catch (error) {
        console.error('Error fetching assets API:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching assets',
            message: error.message
        });
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

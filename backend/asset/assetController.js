const { Op } = require('sequelize');
const db = require('../models');
const Asset = db.Asset;
const AssetHistory = db.AssetHistory;

exports.list = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            category = '', 
            status = '', 
            branch = '',
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = { is_active: true };

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { asset_tag: { [Op.like]: `%${search}%` } },
                { serial_number: { [Op.like]: `%${search}%` } },
                { model: { [Op.like]: `%${search}%` } },
                { manufacturer: { [Op.like]: `%${search}%` } }
            ];
        }

        if (category) whereClause.category_id = category;
        if (status) whereClause.status = status;
        if (branch) whereClause.branch = branch;

        const { count, rows: assets } = await Asset.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [[sortBy, sortOrder.toUpperCase()]]
        });

        const totalPages = Math.ceil(count / limit);

        return res.json({
            success: true,
            data: {
                assets,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error fetching assets',
            message: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const asset = await Asset.findByPk(id);
        
        if (!asset) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }
        
        if (asset.category_id) {
            const category = await db.AssetCategory.findByPk(asset.category_id);
            asset.dataValues.category = category;
        }
        
        return res.json({
            success: true,
            data: asset
        });
        
    } catch (error) {
        console.error('Error fetching asset:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error fetching asset',
            message: error.message
        });
    }
};

exports.create = async (req, res) => {
    try {
        let assetData = req.body;
//convert string to numberic fields 
        if (assetData.warranty_months) {
            assetData.warranty_months = parseInt(assetData.warranty_months);
        }
        if (assetData.purchase_cost) {
            assetData.purchase_cost = parseFloat(assetData.purchase_cost);
        }
        if (assetData.current_value) {
            assetData.current_value = parseFloat(assetData.current_value);
        }
        if (assetData.category_id) {
            assetData.category_id = parseInt(assetData.category_id);
        }
//convert active to boolean 
        assetData.is_active = assetData.is_active !== 'false' && assetData.is_active !== 'off' && assetData.is_active !== '0';
///generate asset tag 
        if (!assetData.asset_tag || assetData.asset_tag.trim() === '') {
            const lastAsset = await Asset.findOne({
                attributes: ['asset_tag'],
                order: [['asset_tag', 'DESC']],
                limit: 1
            });

            let lastId = 0;
            if (lastAsset && lastAsset.asset_tag) {
                const match = lastAsset.asset_tag.match(/\d+/);
                if (match) {
                    lastId = parseInt(match[0]);
                }
            }

            assetData.asset_tag = `AST${String(lastId + 1).padStart(4, '0')}`;
        }

        const asset = await Asset.create(assetData);
        
        return res.status(201).json({
            success: true,
            data: asset,
            message: 'Asset created successfully'
        });

    } catch (error) {
        console.error('Error creating asset:', error);
        
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
        let assetData = req.body;
//convert string to numberic fields
        if (assetData.warranty_months) {
            assetData.warranty_months = parseInt(assetData.warranty_months);
        }
        if (assetData.purchase_cost) {
            assetData.purchase_cost = parseFloat(assetData.purchase_cost);
        }
        if (assetData.current_value) {
            assetData.current_value = parseFloat(assetData.current_value);
        }
        if (assetData.category_id) {
            assetData.category_id = parseInt(assetData.category_id);
        }

        assetData.is_active = assetData.is_active === 'on' || assetData.is_active === true || assetData.is_active === 'true';

        const [updatedRowsCount] = await Asset.update(assetData, { where: { id } });
        
        if (updatedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }

        const updatedAsset = await Asset.findByPk(id);
        
        return res.json({
            success: true,
            data: updatedAsset,
            message: 'Asset updated successfully'
        });

    } catch (error) {
        console.error('Error updating asset:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error updating asset',
            message: error.message
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedRowsCount = await Asset.destroy({ where: { id } });
        
        if (deletedRowsCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }
        
        return res.json({
            success: true,
            message: 'Asset deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting asset:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Error deleting asset',
            message: error.message
        });
    }
};


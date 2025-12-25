const { Op } = require('sequelize');
const db = require('../models');
const Asset = db.Asset;
const AssetHistory = db.AssetHistory;
const AssetCategory = db.AssetCategory;
const Employee = db.Employee;

exports.showAssetForm = async (req, res) => {
    try {
        const { id } = req.params;
        const isEdit = !!id;
// get  categories and employees for dropdowns
        const categories = await AssetCategory.findAll({ 
            where: { is_active: true },
            order: [['name', 'ASC']],
        });
        const employees = await Employee.findAll({ 
            where: { status: 'active' },
            order: [['first_name', 'ASC'], ['last_name', 'ASC']]
        });
        let asset = null;
        if (isEdit) {
// Fetch the asset with its associations for edit
            asset = await Asset.findByPk(id, {
                include: [
                    { 
                        model: db.AssetCategory,
                        as: 'category',
                        attributes: ['id', 'name']
                    },
                    { 
                        model: db.AssetAssignment, 
                        as: 'assignments',
                        include: [{
                            model: db.Employee,
                            as: 'employee',
                            attributes: ['id', 'first_name', 'last_name', 'employee_id']
                        }],
                        where: { 
                            status: 'assigned',
                            return_date: null 
                        },
                        required: false,
                        limit: 1
                    }
                ]
            }); 
            if (!asset) {
                return res.redirect('/assets?error=Asset not found');
            }
        }
        return res.render('asset/asset-form', {
            isEdit,
            asset,
            categories,
            employees,
            formData: {},
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error loading asset form:', error);
        return res.render('asset/asset-form', {
            isEdit: !!req.params.id,
            asset: null,
            categories,
            employees,
            formData: {},
            error: req.query.error || 'Error loading form'
        });
    }
};

exports.list = async (req, res) => {
    try {
        const { 
            category = '', 
            status = '', 
            is_active = '',
            branch = '',
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;
        
// Build where clause for filtering
        const whereClause = {};
        
// Category filter
        if (category) {
 // First try to find category by ID
            if (!isNaN(category)) {
                whereClause.category_id = parseInt(category);
            } else {
                const foundCategory = await db.AssetCategory.findOne({
                    where: { 
                        name: { [Op.iLike]: `%${category}%` },
                        is_active: true 
                    },
                    raw: true
                });
                if (foundCategory) {
                    whereClause.category_id = foundCategory.id;
                }
            }
        }
        
// Status filter
        if (status && ['available', 'assigned', 'maintenance', 'retired'].includes(status)) {
            whereClause.status = status;
        }
        // Active/Inactive filter
        if (is_active === 'true' || is_active === 'false') {
            whereClause.is_active = is_active === 'true';
        }
        // Branch filter
        if (branch) {
            whereClause.branch = branch;
        }
        const assets = await Asset.findAll({
            where: whereClause,
            include: [
                { 
                    model: db.AssetCategory,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                { 
                    model: db.AssetAssignment, 
                    as: 'assignments',
                    include: [{
                        model: db.Employee,
                        as: 'employee',
                        attributes: ['id', 'first_name', 'last_name', 'employee_id']
                    }],
                    where: { 
                        status: 'assigned',
                        return_date: null 
                    },
                    required: false,
                    limit: 1
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]]
        });
// categories for the dropdown
        const categories = await AssetCategory.findAll({ 
            where: { is_active: true },
            order: [['name', 'ASC']],
            raw: true  
        });
// Get  branches for branch filter
        const branches = await Asset.findAll({
            attributes: [
                [db.Sequelize.fn('DISTINCT', db.Sequelize.col('branch')), 'branch']
            ],
            where: {
                branch: { [Op.ne]: null }
            },
            order: [['branch', 'ASC']],
            raw: true
        });
        return res.render('asset/asset', {
            assets,
            categories,
            branches: branches.map(b => b.branch).filter(b => b), 
            category,
            status,
            is_active,
            branch,
            sortBy,
            sortOrder,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error fetching assets:', error);

        return res.render('asset/asset', {
            assets: [],
            categories,
            category: req.query.category || '',
            status: req.query.status || '',
            is_active: req.query.is_active || 'true',
            branch: req.query.branch || '',
            sortBy: req.query.sortBy || 'name',
            sortOrder: req.query.sortOrder || 'ASC',
            error: 'Failed to load assets'
        });
    }
};

// API endpoint to list asset
exports.listAPI = async (req, res) => {
    try {
        const { 
            category = '', 
            status = '', 
            is_active = 'true',
            branch = '',
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;
        const whereClause = {};
                if (category) {
 // First try to find category by ID
            if (!isNaN(category)) {
                whereClause.category_id = parseInt(category);
            } else {
                const foundCategory = await db.AssetCategory.findOne({
                    where: { 
                        name: { [Op.iLike]: `%${category}%` },
                        is_active: true 
                    },
                    raw: true
                });
                if (foundCategory) {
                    whereClause.category_id = foundCategory.id;
                }
            }
        }
        if (status) whereClause.status = status;
        if (branch) whereClause.branch = branch;
        if (is_active) {
            whereClause.is_active = is_active === 'true';
        }
        const assets = await Asset.findAll({
            where: whereClause,
            include: [
                { 
                    model: db.AssetCategory,
                    as: 'category',
                    attributes: ['id', 'name']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]]
        });

        return res.json({
            success: true,
            data: {
                assets
            }
        });
    } catch (error) {
        console.error('Error fetching assets API:', error);
        return res.status(500).json({
            success: false,
            error: 'Error fetching assets',
            message: error.message
        });
    }
};

// View single asset details
exports.viewAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Asset.findByPk(id, {
            include: [
                { 
                    model: db.AssetCategory,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                { 
                    model: db.AssetAssignment, 
                    as: 'assignments',
                    include: [{
                        model: db.Employee,
                        as: 'employee',
                        attributes: ['id', 'first_name', 'last_name', 'employee_id']
                    }],
                    where: { 
                        status: 'assigned',
                        return_date: null 
                    },
                    required: false,
                    limit: 1
                }
            ]
        }); 
        if (!asset) {
            return res.redirect('/assets?error=Asset not found');
        }
        return res.render('asset/asset-view', {
            asset,
            error: req.query.error,
            success: req.query.success
        });
    } catch (error) {
        console.error('Error viewing asset:', error);  
        return res.redirect('/assets?error=Error loading asset details');
    }
};

//create new asset 
exports.create = async (req, res) => {
    try {
        let assetData = req.body;    
// Convert string to numeric fields 
        if (assetData.warranty_months && assetData.warranty_months.trim() !== '') {
            assetData.warranty_months = parseInt(assetData.warranty_months);
        } else {
            assetData.warranty_months = null;
        }
        if (assetData.purchase_cost && assetData.purchase_cost.trim() !== '') {
            assetData.purchase_cost = parseFloat(assetData.purchase_cost);
        } else {
            assetData.purchase_cost = null;
        }
        if (assetData.current_value && assetData.current_value.trim() !== '') {
            assetData.current_value = parseFloat(assetData.current_value);
        } else {
            assetData.current_value = null;
        }
        if (assetData.category_id && assetData.category_id.trim() !== '') {
            assetData.category_id = parseInt(assetData.category_id);
        } else {
            assetData.category_id = null;
        }
// Convert active to boolean 
        assetData.is_active = assetData.is_active === 'true';
// Generate asset tag if not provided or if it already exists
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
        } else {
 // Check if the provided asset_tag already exists
            const existingAsset = await Asset.findOne({
                where: { asset_tag: assetData.asset_tag.trim() }
            });
            if (existingAsset) {
                return res.redirect('/assets/form?error=Asset tag already exists. Please use a different tag or leave empty to auto-generate.');
            }
        }
// Start transaction
        const transaction = await db.sequelize.transaction();  
        try {
// Create the asset
            const asset = await Asset.create(assetData, { transaction });
// If asset is being assigned immediately, create assignment
            if (assetData.status === 'assigned' && assetData.employee_id) {
                const AssetAssignment = db.AssetAssignment;
                await AssetAssignment.create({
                    asset_id: asset.id,
                    employee_id: parseInt(assetData.employee_id),
                    assigned_by: req.user ? req.user.id : 1, 
                    assigned_date: new Date(),
                    status: 'assigned',
                    notes: assetData.assignment_notes || ''
                }, { transaction });          
// Create history record
                await AssetHistory.create({
                    asset_id: asset.id,
                    employee_id: parseInt(assetData.employee_id),
                    action_type: 'assigned',
                    action_date: new Date(),
                    notes: `Asset assigned during creation: ${assetData.assignment_notes || 'No notes provided'}`
                }, { transaction });
            }  
 // Create history record for asset creation
            await AssetHistory.create({
                asset_id: asset.id,
                action_type: 'created',
                action_date: new Date(),
                notes: `Asset created with status: ${assetData.status}`
            }, { transaction });
            await transaction.commit();
// Redirect to assets list with success message
            return res.redirect('/assets?success=Asset created successfully');
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('Error creating asset:', error);
 // Redirect back with error message
        return res.redirect('/assets/form?error=Error creating asset: ' + error.message);
    }
};
//update asset
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        let assetData = req.body;
// Convert string to numeric fields
        if (assetData.warranty_months && assetData.warranty_months.trim() !== '') {
            assetData.warranty_months = parseInt(assetData.warranty_months);
        } else {
            assetData.warranty_months = null;
        }
        if (assetData.purchase_cost && assetData.purchase_cost.trim() !== '') {
            assetData.purchase_cost = parseFloat(assetData.purchase_cost);
        } else {
            assetData.purchase_cost = null;
        }
        if (assetData.current_value && assetData.current_value.trim() !== '') {
            assetData.current_value = parseFloat(assetData.current_value);
        } else {
            assetData.current_value = null;
        }
        if (assetData.category_id && assetData.category_id.trim() !== '') {
            assetData.category_id = parseInt(assetData.category_id);
        } else {
            assetData.category_id = null;
        }
// Only handle is_active field if it's present in the form data
        if (assetData.is_active !== undefined) {
            assetData.is_active = assetData.is_active === 'true';
        }
// Don't allow asset_tag to be updated
        delete assetData.asset_tag;
        delete assetData.current_assignment; 

        const [updatedRowsCount] = await Asset.update(assetData, { where: { id } });
        
        if (updatedRowsCount === 0) {
            return res.redirect(`/assets/${id}/form?error=Asset not found`);
        }
// Create history record for asset update
        await AssetHistory.create({
            asset_id: parseInt(id),
            action_type: 'updated',
            action_date: new Date(),
            notes: `Asset updated with new status: ${assetData.status || 'unchanged'}`
        });
// Redirect to assets list
        return res.redirect('/assets');

    } catch (error) {
        console.error('Error updating asset:', error);
// Redirect back with error message
        return res.redirect(`/assets/${id}/form?error=Error updating asset: ${error.message}`);
    }
};
//delete asset
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
// Start transaction to ensure data consistency
        const transaction = await db.sequelize.transaction();
        try {
// First delete related asset histories
            await AssetHistory.destroy({ 
                where: { asset_id: id },
                transaction 
            });  
// Then delete related asset assignments
            await db.AssetAssignment.destroy({ 
                where: { asset_id: id },
                transaction 
            });    
// Finally delete the asset
            const deletedRowsCount = await Asset.destroy({ 
                where: { id },
                transaction 
            });   
            if (deletedRowsCount === 0) {
                await transaction.rollback();
                return res.redirect('/assets?error=Asset not found');
            }
// Commit the transaction
            await transaction.commit();
// Redirect to assets list
            return res.redirect('/assets');
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
    } catch (error) {
        console.error('Error deleting asset:', error);
    }
};
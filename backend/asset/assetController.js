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
        
        // Fetch categories and employees for dropdowns
        const categories = await AssetCategory.findAll({ 
            where: { is_active: true },
            order: [['name', 'ASC']],
            raw: true 
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
        
        // Still try to fetch categories and employees for the dropdown even if there's an error
        let categories = [];
        let employees = [];
        try {
            categories = await AssetCategory.findAll({ 
                where: { is_active: true },
                order: [['name', 'ASC']],
                raw: true  // Return plain JSON objects
            });
            employees = await Employee.findAll({ 
                where: { status: 'active' },
                order: [['first_name', 'ASC'], ['last_name', 'ASC']]
            });
        } catch (fetchError) {
            console.error('Error fetching dropdown data:', fetchError);
        }
        
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
            search = '', 
            category = '', 
            status = '', 
            branch = '',
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;

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



        // Fetch categories for the dropdown
        const categories = await AssetCategory.findAll({ 
            where: { is_active: true },
            order: [['name', 'ASC']],
            raw: true  // Return plain JSON objects
        });

        return res.render('asset/asset', {
            assets,
            categories,
            search,
            category,
            status,
            branch,
            sortBy,
            sortOrder
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
        
        // Still try to fetch categories for the dropdown even if assets fail
        let categories = [];
        try {
            categories = await AssetCategory.findAll({ 
                where: { is_active: true },
                order: [['name', 'ASC']],
                raw: true  // Return plain JSON objects
            });
        } catch (categoryError) {
            console.error('Error fetching categories:', categoryError);
        }
        
        return res.render('asset/asset', {
            assets: [],
            categories,
            error: 'Error fetching assets'
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const asset = await Asset.findByPk(id, {
            include: [
                { model: db.AssetCategory, as: 'category' },
                { model: db.Employee, as: 'assignedEmployee' }
            ]
        });
        
        if (!asset) {
            return res.render('asset/asset', {
                assets: [],
                error: 'Asset not found'
            });
        }
        
        return res.render('asset/asset-detail', {
            asset
        });
        
    } catch (error) {
        console.error('Error fetching asset:', error);
        
        return res.render('asset/asset', {
            assets: [],
            error: 'Error fetching asset'
        });
    }
};

exports.create = async (req, res) => {
    try {
        let assetData = req.body;
        
        // Convert string to numeric fields 
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
        
        // Convert active to boolean 
        assetData.is_active = assetData.is_active !== 'false' && assetData.is_active !== 'off' && assetData.is_active !== '0';
        
        // Generate asset tag if not provided
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
                    assigned_by: req.user ? req.user.id : 1, // Use current user or default
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

exports.showEditForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch the asset with its associations
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
        
        // Fetch categories and employees for dropdowns
        const categories = await AssetCategory.findAll({ 
            where: { is_active: true },
            order: [['name', 'ASC']]
        });
        
        const employees = await Employee.findAll({ 
            where: { status: 'active' },
            order: [['first_name', 'ASC'], ['last_name', 'ASC']]
        });

        return res.render('asset/edit-asset', {
            asset,
            categories,
            employees,
            formData: {},
            error: req.query.error,
            success: req.query.success
        });

    } catch (error) {
        console.error('Error loading edit asset form:', error);
        
        // Still try to fetch categories and employees for the dropdown even if there's an error
        let categories = [];
        let employees = [];
        try {
            categories = await AssetCategory.findAll({ 
                where: { is_active: true },
                order: [['name', 'ASC']],
                raw: true  // Return plain JSON objects
            });
            employees = await Employee.findAll({ 
                where: { status: 'active' },
                order: [['first_name', 'ASC'], ['last_name', 'ASC']]
            });
        } catch (fetchError) {
            console.error('Error fetching dropdown data:', fetchError);
        }
        
        return res.render('asset/asset-form', {
            isEdit: true,
            asset: null,
            categories,
            employees,
            formData: {},
            error: req.query.error || 'Error loading edit form'
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        let assetData = req.body;
        
        // Convert string to numeric fields
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

        // Don't allow asset_tag to be updated
        delete assetData.asset_tag;
        delete assetData.current_assignment; // Remove the read-only field

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

        // Redirect to assets list with success message
        return res.redirect('/assets?success=Asset updated successfully');

    } catch (error) {
        console.error('Error updating asset:', error);
        
        // Redirect back with error message
        return res.redirect(`/assets/${id}/form?error=Error updating asset: ${error.message}`);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedRowsCount = await Asset.destroy({ where: { id } });
        
        if (deletedRowsCount === 0) {
            return res.redirect('/assets?error=Asset not found');
        }
        
        // Redirect to assets list with success message
        return res.redirect('/assets?success=Asset deleted successfully');

    } catch (error) {
        console.error('Error deleting asset:', error);
        
        // Redirect back with error message
        return res.redirect('/assets?error=Error deleting asset');
    }
};


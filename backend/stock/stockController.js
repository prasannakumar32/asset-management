const db = require('../models');
const { Op } = require('sequelize');

//display stock in birds eye 
exports.stockView = async (req, res) => {
    try {
//fetch all available asset 
        const availableAssets = await db.Asset.findAll({
            where: {
                status: 'available',
                is_active: true
            },
            include: [{
                model: db.AssetCategory,
                as: 'category'
            }],
            order: [['branch', 'ASC'], ['name', 'ASC']]
        });
        
//set asset fetch by branch
        const assetsByBranch = {};
        let totalValue = 0;

        availableAssets.forEach(asset => {
            const branch = asset.branch || 'unassigned';
            if (!assetsByBranch[branch]) {
                assetsByBranch[branch] = {
                    assets: [],
                    count: 0,
                    totalvalue: 0
                };
            }
            assetsByBranch[branch].assets.push(asset);
            assetsByBranch[branch].count++;
            
            const assetValue = parseFloat(asset.current_value || asset.purchase_cost || 0);
            assetsByBranch[branch].totalvalue += assetValue;
            totalValue += assetValue;
        });

// display category summary
        const categorySummary = {};
        availableAssets.forEach(asset => {
            const categoryName = asset.category ? asset.category.name : 'Uncategorized';
            if (!categorySummary[categoryName]) {
                categorySummary[categoryName] = 0;
            }
            categorySummary[categoryName]++;
        });

        res.json({
            assetsByBranch,
            categorySummary,
            totalValue,
            totalAssets: availableAssets.length
        });
    } catch (error) {
        console.error('Error loading stock view:', error);
        res.status(500).json({ error: 'Error loading stock data' });
    }
};

exports.stockData = async (req, res) => {
    try {
        const { branch, category } = req.query;
        const whereClause = {
            status: 'available',
            is_active: true
        };
        if (branch && branch !== 'all') {
            whereClause.branch = branch;
        }
        const assets = await db.Asset.findAll({
            where: whereClause,
            include: [{
                model: db.AssetCategory,
                as: 'category'
            }],
            order: [['name', 'ASC']]
        });
        res.json(assets);
    } catch (error) {
        console.error('Error fetching stock data:', error);
        res.status(500).json({ error: 'Error fetching stock data' });
    }
};

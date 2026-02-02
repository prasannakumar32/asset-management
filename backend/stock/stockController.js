const db = require('../models');
const { Op } = require('sequelize');

// api endpoint for stock data
exports.getStockData = async (req, res) => {
  try {
    const allAssets = await db.Asset.findAll({
      where: {
        is_active: true
      },
      include: [{
        model: db.AssetCategory,
        as: 'category'
      }],
      order: [['branch', 'ASC'], ['name', 'ASC']]
    });

    // group assets by branch
    const assetsByBranch = {};
    let totalValue = 0;
    const availableCount = { available: 0, assigned: 0, maintenance: 0, retired: 0, scrapped: 0 };

    allAssets.forEach(asset => {
      const branch = asset.branch || 'Unassigned';
      
      if (!assetsByBranch[branch]) {
        assetsByBranch[branch] = {
          assets: [],
          available: 0,
          assigned: 0,
          maintenance: 0,
          retired: 0,
          scrapped: 0,
          totalValue: 0
        };
      }

      assetsByBranch[branch].assets.push(asset);
      assetsByBranch[branch][asset.status]++;
      availableCount[asset.status]++;
      
      const assetValue = parseFloat(asset.current_value || asset.purchase_cost || 0);
      assetsByBranch[branch].totalValue += assetValue;
      totalValue += assetValue;
    });

    return res.json({
      success: true,
      data: {
        assetsByBranch,
        totalValue,
        totalAssets: allAssets.length,
        availableCount
      }
    });
  } catch (error) {
    console.error('Error loading stock data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load stock data',
      message: error.message
    });
  }
};

//stock page 
exports.showStockPage = async (req, res) => {
  try {
    return res.render('stock/stock', {
      title: 'Stock',
      currentPage: 'stock'
    });
  } catch (error) {
    console.error('Error rendering stock page:', error);
    return res.status(500).render('error', { error: 'Error loading stock page' });
  }
};


const db = require('../models');
const { Op } = require('sequelize');
 
exports.stockView = async (req, res) => {
  try {
    //fetch all assets
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

//set asset fetch by branch 
    const assetsByBranch = {};
    let totalValue = 0;
    const availableCount = { available: 0, assigned: 0, maintenance: 0, retired: 0, scrapped: 0 };

    allAssets.forEach(asset => {
      const branch = asset.branch || 'Unassigned';
      
      if (!assetsByBranch[branch]) {
        assetsByBranch[branch] = {
          assets: [],
          count: 0,
          totalValue: 0,
          available: 0,
          assigned: 0,
          maintenance: 0,
          retired: 0,
          scrapped: 0
        };
      }

      assetsByBranch[branch].assets.push(asset);
      assetsByBranch[branch].count++;
      assetsByBranch[branch][asset.status]++;
      availableCount[asset.status]++;
      
      const assetValue = parseFloat(asset.current_value || asset.purchase_cost || 0);
      assetsByBranch[branch].totalValue += assetValue;
      totalValue += assetValue;
    });
    res.render('stock/stock', {
      assetsByBranch,
      totalValue,
      totalAssets: allAssets.length,
      availableCount
    });
  } catch (error) {
    console.error('Error loading stock view:', error);
    res.redirect('/dashboard');
  }
};

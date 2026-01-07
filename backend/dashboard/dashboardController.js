const db = require('../models');
const { Op } = require('sequelize');

const getDashboard = async (req, res) => {
  try {
    const [assetCount, employeeCount, assignedCount] = await Promise.all([
      db.Asset.count({ 
        where: { 
          [Op.or]: [
            { is_active: true }
          ]
        } 
      }),
      db.Employee.count({ 
        where: { status: 'active' } 
      }),
      db.AssetAssignment.count({
        where: { 
          status: 'assigned',
          return_date: null
        }
      })
    ]);

// Calculate available assets
    const availableCount = Math.max(0, assetCount - assignedCount);
    res.render('dashboard', {
      title: 'Dashboard',
      username: req.user?.username || 'Guest',
      currentPage: 'dashboard',
      assetCount: assetCount || 0,
      employeeCount: employeeCount || 0,
      assignedCount: assignedCount || 0,
      availableCount: availableCount || 0
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', {
      title: 'Dashboard',
      username: req.user?.username || 'Guest',
      currentPage: 'dashboard',
      assetCount: 0,
      employeeCount: 0,
      assignedCount: 0,
      availableCount: 0
    });
  }
};

module.exports = { getDashboard };
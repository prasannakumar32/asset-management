const db = require('../models');
const { Op } = require('sequelize');

const getDashboardData = async (req, res) => {
  try {
    const [assetCount, employeeCount, assignedCount] = await Promise.all([
      db.Asset.count({ where: { [Op.or]: [{ is_active: true }] } }),
      db.Employee.count({ where: { status: 'active' } }),
      db.AssetAssignment.count({
        where: { status: 'assigned', return_date: null }
      })
    ]);

    const availableCount = Math.max(0, assetCount - assignedCount);
    
    res.json({
      success: true,
      data: { assetCount, employeeCount, assignedCount, availableCount }
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      data: { assetCount: 0, employeeCount: 0, assignedCount: 0, availableCount: 0 }
    });
  }
};

module.exports = { getDashboardData };
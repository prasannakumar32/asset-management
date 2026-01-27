const db = require('../models');
const { Op } = require('sequelize');

exports.getDashboardData = async (req, res) => {
  try {
// Get all assets 
    const activeAssets = await db.Asset.findAll({
      where: { is_active: true },
      attributes: ['id']
    });
    const assetCount = activeAssets.length;

// Get all active employees 
    const activeEmployees = await db.Employee.findAll({
      where: { status: 'active' },
      attributes: ['id']
    });
    const employeeCount = activeEmployees.length;

// Get all assigned assets
    const assignedAssets = await db.AssetAssignment.findAll({
      where: { status: 'assigned', return_date: null },
      attributes: ['id']
    });
    const assignedCount = assignedAssets.length;

// Get available assets
    const availableAssets = await db.Asset.findAll({
      where: { 
        is_active: true,
        status: 'available'
      },
      attributes: ['id']
    });
    const availableCount = availableAssets.length;
    
    res.json({
      success: true,
      data: { 
        assetCount, 
        employeeCount, 
        assignedCount, 
        availableCount
      }
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      data: { 
        assetCount: 0, 
        employeeCount: 0, 
        assignedCount: 0, 
        availableCount: 0
      }
    });
  }
};
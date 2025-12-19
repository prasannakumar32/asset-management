const db = require('../models');
const { Op } = require('sequelize');

exports.getDashboard = async (req, res) => {
  try {
    const [assets, employees, assignedAssets, recentActivities] = await Promise.all([
      db.AssetAssignment.count({
        where: { status: 'assigned' }
      }),
      db.AssetAssignment.findAll({
        limit: 10,
        order: [['assigned_date', 'DESC']],
        include: [
          {
            model: db.Asset,
            as: 'asset',
            attributes: ['id', 'name', 'asset_tag']
          }
        ]
      })
    ]);

    console.log('activities found:', recentActivities.length);
    console.log('First activity:', JSON.stringify(recentActivities[0], null, 2));

    const activities = recentActivities.map(activity => ({
      id: activity.id,
      type: activity.status,
      assetName: activity.asset ? activity.asset.name : 'Unknown Asset',
      assetTag: activity.asset ? activity.asset.asset_tag : 'N/A',
      employeeName: activity.employee ? 
        `${activity.employee.first_name} ${activity.employee.last_name}` : 
        'Unassigned',
      date: activity.assigned_date,
      status: activity.status
    }));

    console.log('Formatted activities:', activities.length);

    res.render('index', {
      assetCount: assets,
      employeeCount: employees,
      assignedAssetCount: assignedAssets,
      activities: activities
    });
  } catch (error) {
    console.error('Error fetching data for dashboard:', error);
    res.status(500).render('error', { 
      message: 'Error loading dashboard',
      error: { status: 500 }
    });
  }
};
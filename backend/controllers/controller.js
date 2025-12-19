const db = require('../models');
const { Op } = require('sequelize');

exports.getDashboard=async(req,res) =>{
    try{
        const[asset,employee,asset_assignment,recentActivities]=await Promise.all
        db.AssetAssignment.count({
        where: { status: 'assigned' }
      }),
      db.AssetAssignment.findAll({
        limit: 25,
        order: [['assigned_date', 'DESC']],
        include: [
          {
            model: db.Asset,
            as: 'asset',
            attributes: ['id', 'name', 'asset_tag']
          }
        ]
      })
    res.render('index', {
      assignedAssetCount: assignedAssets
    });
  } catch (error) {
    console.error('Error fetching data for dashboard:', error);
    res.status(500).render('error', { 
      message: 'Error loading dashboard',
      error: { status: 500 }
    });
  }
};
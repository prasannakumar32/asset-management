const db = require('../models');
const { Op } = require('sequelize');

// Get single asset history by ID
exports.getAssetHistory = async(req, res) => {
  try {
    const { id } = req.params;
    const asset = await db.Asset.findByPk(id, {
      include: [{
        model: db.AssetCategory,
        as: 'category'
      }]
    });

    if(!asset){
      return res.redirect('/assets');
    }
// Get all asset assignments
    const assignments = await db.AssetAssignment.findAll({
      where:{asset_id:id},
      include:[
        {
          model:db.Employee,as:'employee'
        },
        {
          model:db.Employee,as:'assignedBy'
        }
      ],
      order:[['assigned_date','DESC']]
    });
// Get asset history records
    const histories = await db.AssetHistory.findAll({
      where: { asset_id: id },
      include: [
        {
          model: db.Employee,
          as: 'employee'
        },
        {
          model: db.Employee,
          as: 'performedBy'
        }
      ],
      order: [['action_date', 'DESC']]
    });

//create timeline for chronological order 
const timeline =[];
// Add history records to timeline
histories.forEach(history => {
  timeline.push({
    date: history.action_date,
    type: history.action_type,
    title: history.action_type ? history.action_type.charAt(0).toUpperCase() + history.action_type.slice(1) : 'Action',
    description: history.action_type || 'Action performed',
    details: history.notes || null,
    icon: 'fas-circle',
    color: 'secondary'
  });
});
// Add assignment history to timeline
assignments.forEach(assignment => {
  timeline.push({
    date: assignment.assigned_date,
    type: 'assigned',
    title: 'Asset Issued',
    description: `Issued to ${assignment.employee ? assignment.employee.first_name + ' ' + assignment.employee.last_name : 'Unknown'}`,
    details: assignment.notes || null,
    icon: 'fas-hand-holding-box',
    color: 'primary'
  });
  
  if (assignment.return_date) {
    timeline.push({
      date: assignment.return_date,
      type: 'returned',
      title: 'Asset Returned',
      description: `Returned by ${assignment.employee ? assignment.employee.first_name + ' ' + assignment.employee.last_name : 'Unknown'}`,
      details: `Condition: ${assignment.return_condition}${assignment.return_notes ? ' - ' + assignment.return_notes : ''}`,
      icon: 'fas-undo',
      color: assignment.return_condition === 'damaged' ? 'warning' : 'success'
    });
  }
});
    res.render('assetHistory/asset-history', {
      asset,
      assignments,
      histories,
      timeline,
      metrics: {
        totalAssignments: assignments.length,
        currentAssignment: assignments.find(a => a.status === 'assigned')
      }
    });
  } catch (error) {
    console.error('Asset history error:', error.message);
    res.status(500).render('error', {
      message: 'Error retrieving asset history',
      error: error
    });
  }
};

exports.listAllAssetHistories = async(req, res) => {
  try {
    const assets = await db.Asset.findAll({
      include: [{
        model: db.AssetCategory,
        as: 'category'
      }],
      order: [['name', 'ASC']]
    });

    res.render('assetHistory/asset-history', { 
      assets,
      asset: null,
      timeline: null
    });

  } catch (error) {
    console.error('Error fetching assets:', error.message);
    res.redirect('/');
  }
};


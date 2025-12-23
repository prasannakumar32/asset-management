const db = require('../models');
const { Op } = require('sequelize');

// Get single asset history by ID
exports.getAssetHistory = async(req, res) => {
  try {
    const { id } = req.params;
    // Get asset with the specified ID
    const asset = await db.Asset.findByPk(id, {
      include: [{
        model: db.AssetCategory,
        as: 'category'
      }]
    });
    if(!asset){
      req.flash('error_msg','Asset not found');
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
    
    // Sort timeline by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalDays = asset.purchase_date ? 
      Math.ceil((new Date() - new Date(asset.purchase_date)) / (1000 * 60 * 60 * 24)) : 0;
    let assignedDays = 0;
    assignments.forEach(assignment => {
      try {
        const startDate = new Date(assignment.assigned_date);
        const endDate = assignment.return_date ? new Date(assignment.return_date) : new Date();
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          assignedDays += Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        }
      } catch (dateError) {
        console.warn('Invalid date in assignment:', assignment.id);
      }
    });

    res.render('assetHistory/assetHistory', {
      asset,
      assignments,
      histories,
      timeline,
      metrics: {
        totalDays,
        assignedDays,
        totalAssignments: assignments.length,
        currentAssignment: assignments.find(a => a.status === 'assigned')
      }
    });
  } catch (error) {
    console.error('Asset history error:', error.message);
    res.status(500).json({ error: 'error loading asset history'})
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
    res.json(assets);
  } catch(error) {
    console.error('Error fetching assets:', error.message);
    res.status(500).json({ error: 'Error loading asset history' });
  }
};


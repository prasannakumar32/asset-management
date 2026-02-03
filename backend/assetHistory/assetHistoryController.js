const db = require('../models');

// Show asset history page
exports.list = (req, res) => {
  res.render('assetHistory/asset-history', { currentPage: 'asset-history' });
};

//get all assets history API
exports.listAPI = async(req, res) => {
  try {
    const assets = await db.Asset.findAll({
      include: [{
        model: db.AssetCategory,
        as: 'category'
      }],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: { assets } });
  } catch (error) {
    console.error('Error fetching assets API:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error fetching assets',
      message: error.message
    });
  }
};

// API method to get single asset history
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
      return res.status(404).json({ success: false, error: 'Asset not found' });
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

// Create timeline for chronological order 
    const timeline = [];
    
    // convert action type to camelCase
    const toCamelCase = (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };
    
// Add history records to timeline
    histories.forEach(history => {
      if (history.action_date && !['assigned', 'returned', 'updated'].includes(history.action_type)) {
        const actionDate = new Date(history.action_date);
        //get time from created at 
        if (history.created_at) {
          const createdAt = new Date(history.created_at);
          actionDate.setHours(createdAt.getHours());
          actionDate.setMinutes(createdAt.getMinutes());
          actionDate.setSeconds(createdAt.getSeconds());
        }
        
        let details = history.notes || null;
        
        timeline.push({
          date: actionDate,
          timestamp: actionDate.getTime(),
          type: history.action_type,
          description: toCamelCase(history.action_type) || 'Action Performed',
          details: details,
          icon: 'fas-circle',
          color: 'secondary'
        });
      }
    });

    // Add assignment history to timeline
    assignments.forEach(assignment => {
      if (assignment.assigned_date) {
        const assignDate = new Date(assignment.assigned_date);
        // Add time component from created_at to ensure proper sorting
        if (assignment.created_at) {
          const createdAt = new Date(assignment.created_at);
          assignDate.setHours(createdAt.getHours());
          assignDate.setMinutes(createdAt.getMinutes());
          assignDate.setSeconds(createdAt.getSeconds());
        }
        timeline.push({
          date: assignDate,
          timestamp: assignDate.getTime(),
          type: 'assigned',
          description: `Issued To ${assignment.employee ? assignment.employee.first_name + ' ' + assignment.employee.last_name : 'Unknown'}`,
          details: assignment.notes || null,
          icon: 'fas-hand-holding-box',
          color: 'primary'
        });
      }
      
      if (assignment.return_date) {
        const returnDate = new Date(assignment.return_date);
        // Add time component from updated_at to ensure proper sorting
        if (assignment.updated_at) {
          const updatedAt = new Date(assignment.updated_at);
          returnDate.setHours(updatedAt.getHours());
          returnDate.setMinutes(updatedAt.getMinutes());
          returnDate.setSeconds(updatedAt.getSeconds());
        }
        timeline.push({
          date: returnDate,
          timestamp: returnDate.getTime(),
          type: 'returned',
          description: `Returned By ${assignment.employee ? assignment.employee.first_name + ' ' + assignment.employee.last_name : 'Unknown'}`,
          details: `Condition: ${assignment.return_condition}${assignment.return_notes ? ' - ' + assignment.return_notes : ''}`,
          icon: 'fas-undo',
          color: assignment.return_condition === 'damaged' ? 'warning' : 'success'
        });
      }
    });

    // Sort timeline by timestamp descending
    timeline.sort((a, b) => b.timestamp - a.timestamp);
    
    // Remove duplicates 
    const uniqueTimeline = [];
    const seen = new Set();
    
    timeline.forEach(item => {
      const key = `${item.timestamp}-${item.type}-${item.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTimeline.push(item);
      }
    });

    res.json({ 
      success: true, 
      data: {
        asset,
        assignments,
        histories,
        timeline: uniqueTimeline,
        metrics: {
          totalAssignments: assignments.length,
          currentAssignment: assignments.find(a => a.status === 'assigned')
        }
      }
    });
  } catch (error) {
    console.error('Asset history API error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error retrieving asset history',
      message: error.message
    });
  }
};

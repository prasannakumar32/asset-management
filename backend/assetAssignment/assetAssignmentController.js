const db = require('../models');
const { Op } = require('sequelize');
const { Asset, Employee, AssetAssignment } = db;

// Get all asset assignments
exports.listAssignments = async (req, res) => {
  try {
    const { 
      page = 1,
      limit = 10,
      search = '',
      status = '', 
      sortBy = 'assigned_date',
      sortOrder = 'DESC' } = req.query;

    const offset = (page - 1) * limit;

// Build where clause
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { notes: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: assignments } = await AssetAssignment.findAndCountAll({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['id', 'name', 'asset_tag', 'status']
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Employee,
          as: 'assignedBy',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load assignments. Please try again.'
    });
  }
};
// Get single assignment
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await AssetAssignment.findByPk(req.params.id, {
      include: [
        {
          model: Asset,
          as: 'asset',
          attributes: ['id', 'name', 'asset_tag', 'status']
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Employee,
          as: 'assignedBy',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load assignment details',
      message: error.message
    });
  }
};

// Create assignment
exports.createAssignment = async (req, res) => {
  try {
    const assignmentData = req.body;
    
// Set assigned date if not provided
    if (!assignmentData.assigned_date) {
      assignmentData.assigned_date = new Date().toISOString().split('T')[0];
    }

// Set default status
    assignmentData.status = 'assigned';

    const assignment = await AssetAssignment.create(assignmentData);

// Update asset status
    await Asset.update(
      { status: 'assigned' },
      { where: { id: assignmentData.asset_id } }
    );

    res.status(201).json({
      success: true,
      message: 'Asset assigned successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error assigning asset',
      message: error.message
    });
  }
};

// Update assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignmentData = req.body;

    const assignment = await AssetAssignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    await assignment.update(assignmentData);

// Update asset status if returned
    if (assignmentData.status === 'returned') {
      await Asset.update(
        { status: 'available' },
        { where: { id: assignment.asset_id } }
      );
    }
    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating assignment',
      message: error.message
    });
  }
};

// Delete assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await AssetAssignment.findByPk(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }
// Update asset status back to available
    await Asset.update(
      { status: 'available' },
      { where: { id: assignment.asset_id } }
    );
    await assignment.destroy();
    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting assignment',
      message: error.message
    });
  }
};


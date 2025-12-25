const db = require('../models');
const { Op } = require('sequelize');
const { Asset, Employee, AssetAssignment } = db;

// Get all asset assignments
exports.listAssignments = async (req, res) => {
  try {
    const { 
      search = '',
      status = '', 
      sortBy = 'assigned_date',
      sortOrder = 'DESC' } = req.query;

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

    const assignments = await AssetAssignment.findAll({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
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

    res.json({
      success: true,
      data: {
        assignments
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

// Get assignments by employee
exports.getAssignmentsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const assignments = await AssetAssignment.findAll({
      where: { 
        employee_id: employeeId,
        status: 'assigned'
      },
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
      ],
      order: [['assigned_date', 'DESC']]
    });
    res.json({
      success: true,
      data: {
        assignments
      }
    });
  } catch (error) {
    console.error('Error fetching employee assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching employee assignments',
      message: error.message
    });
  }
};
// Return asset
exports.returnAsset = async (req, res) => {
  try {
    const { employee_id, asset_id, return_date, return_condition, notes } = req.body;
    const assignment = await AssetAssignment.findOne({
      where: {
        employee_id: employee_id,
        asset_id: asset_id,
        status: 'assigned'
      }
    });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Active assignment not found'
      });
    }
    // Start transaction
    const transaction = await db.sequelize.transaction();
    try {
      await assignment.update({
        status: 'returned',
        return_date: new Date(return_date),
        return_condition: return_condition || 'good',
        return_notes: notes || ''
      }, { transaction });
      await Asset.update(
        { status: 'available' },
        { where: { id: asset_id } },
        { transaction }
      );
      // Create history record
      await db.AssetHistory.create({
        asset_id: asset_id,
        employee_id: employee_id,
        action_type: 'returned',
        action_date: new Date(),
        notes: `Asset returned on ${return_date}. Condition: ${return_condition || 'good'}. ${notes || ''}`
      }, { transaction });
      await transaction.commit();
      res.json({
        success: true,
        message: 'Asset returned successfully'
      });
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({
      success: false,
      error: 'Error returning asset',
      message: error.message
    });
  }
};

// Show return form
exports.showReturnForm = async (req, res) => {
  try {
    return res.render('asset-assignment/return-form', {
      error: req.query.error,
      success: req.query.success
    });
  } catch (error) {
    console.error('Error loading return form:', error);
    return res.render('asset-assignment/return-form', {
      error: req.query.error || 'Error loading return form'
    });
  }
};
// Show issue form
exports.showIssueForm = async (req, res) => {
  try {
    return res.render('asset-assignment/issue-form', {
      error: req.query.error,
      success: req.query.success
    });
  } catch (error) {
    console.error('Error loading issue form:', error);
    return res.render('asset-assignment/issue-form', {
      error: req.query.error || 'Error loading issue form'
    });
  }
};

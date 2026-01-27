const db = require('../models');
const { Op } = require('sequelize');
const { Asset, Employee, AssetAssignment } = db;

// Helper functions
const sendResponse = (res, status, success, message, data) => {
  const response = { success: success, message: message };
  if (data) {
    response.data = data;
  }
  res.status(status).json(response);
};
const sendError = (res, status, error, message) => {
  const response = { success: false, error: error };
  if (message) {
    response.message = message;
  }
  res.status(status).json(response);
};
const updateAssetStatus = async (assetId, status) => {
  await Asset.update({ status }, { where: { id: assetId } });
};

const withTransaction = async (callback) => {
  const transaction = await db.sequelize.transaction();
  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Create assignment
exports.createAssignment = async (req, res) => {
  try {
    const assignmentData = {};
    for (const key in req.body) {
      assignmentData[key] = req.body[key];
    }
    assignmentData.assigned_date = req.body.assigned_date || new Date().toISOString().split('T')[0];
    assignmentData.status = 'assigned';

    // Validate required fields
    const fieldErrors = {};
    if (!assignmentData.asset_id) {
      fieldErrors.asset_id = 'Asset is required';
    }
    if (!assignmentData.employee_id) {
      fieldErrors.employee_id = 'Employee is required';
    }
    if (!assignmentData.assigned_by) {
      fieldErrors.assigned_by = 'Assigned by is required';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        fieldErrors
      });
    }

    // Check if asset is available
    const asset = await Asset.findByPk(assignmentData.asset_id);
    if (!asset) {
      return res.status(400).json({
        success: false,
        error: 'Asset not found',
        fieldErrors: {
          asset_id: 'Selected asset not found'
        }
      });
    }

    if (asset.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'Asset is not available for assignment',
        fieldErrors: {
          asset_id: 'Asset is not available'
        }
      });
    }

    // Check if employee exists and is active
    const employee = await Employee.findByPk(assignmentData.employee_id);
    if (!employee) {
      return res.status(400).json({
        success: false,
        error: 'Employee not found',
        fieldErrors: {
          employee_id: 'Selected employee not found'
        }
      });
    }

    if (employee.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Employee is not active',
        fieldErrors: {
          employee_id: 'Selected employee is not active'
        }
      });
    }

    const assignment = await AssetAssignment.create(assignmentData);
    await updateAssetStatus(assignmentData.asset_id, 'assigned');

    return res.status(201).json({
      success: true,
      message: 'Asset assigned successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const fieldErrors = {};
      error.errors.forEach(err => {
        fieldErrors[err.path] = err.message;
      });
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        fieldErrors
      });
    }
    
    return res.status(500).json({
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
    const assignment = await AssetAssignment.findByPk(id);
    
    if (!assignment) {
      return sendError(res, 404, 'Assignment not found');
    }

    await assignment.update(req.body);

    if (req.body.status === 'returned') {
      await updateAssetStatus(assignment.asset_id, 'available');
    }

    sendResponse(res, 200, true, 'Assignment updated successfully', { data: assignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    sendError(res, 500, 'Error updating assignment', error.message);
  }
};

// Delete assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await AssetAssignment.findByPk(req.params.id);
    
    if (!assignment) {
      return sendError(res, 404, 'Assignment not found');
    }

    await updateAssetStatus(assignment.asset_id, 'available');
    await assignment.destroy();

    sendResponse(res, 200, true, 'Assignment deleted successfully');
  } catch (error) {
    console.error('Error deleting assignment:', error);
    sendError(res, 500, 'Error deleting assignment', error.message);
  }
};

// Get assignments by employee
exports.getAssignmentsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const assignments = await AssetAssignment.findAll({
      where: { employee_id: employeeId, status: 'assigned' },
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'asset_tag', 'status'] },
        { model: Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Employee, as: 'assignedBy', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['assigned_date', 'DESC']]
    });

    sendResponse(res, 200, true, 'Assignments retrieved successfully', { assignments });
  } catch (error) {
    console.error('Error fetching employee assignments:', error);
    sendError(res, 500, 'Error fetching employee assignments', error.message);
  }
};

// Return asset
exports.returnAsset = async (req, res) => {
  try {
    const { employee_id, asset_id, return_date, return_condition, notes } = req.body;
    
    // Validate required fields
    const fieldErrors = {};
    if (!employee_id) {
      fieldErrors.employee_id = 'Employee is required';
    }
    if (!asset_id) {
      fieldErrors.asset_id = 'Asset is required';
    }
    if (!return_date) {
      fieldErrors.return_date = 'Return date is required';
    }
    if (!return_condition) {
      fieldErrors.return_condition = 'Return condition is required';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        fieldErrors
      });
    }
    
    const assignment = await AssetAssignment.findOne({
      where: { employee_id, asset_id, status: 'assigned' }
    });
    
    if (!assignment) {
      return res.status(400).json({
        success: false,
        error: 'No active assignment found for this employee and asset',
        fieldErrors: {
          asset_id: 'Asset is not currently assigned to this employee'
        }
      });
    }

    await withTransaction(async (transaction) => {
      await assignment.update({
        status: 'returned',
        return_date: new Date(return_date),
        return_condition: return_condition || 'good',
        return_notes: notes || ''
      }, { transaction });

      await updateAssetStatus(asset_id, 'available');

      await db.AssetHistory.create({
        asset_id,
        employee_id,
        action_type: 'returned',
        action_date: new Date(),
        notes: `Asset returned on ${return_date}. Condition: ${return_condition || 'good'}. ${notes || ''}`
      }, { transaction });
    });

    return res.json({
      success: true,
      message: 'Asset returned successfully'
    });
  } catch (error) {
    console.error('Error returning asset:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const fieldErrors = {};
      error.errors.forEach(err => {
        fieldErrors[err.path] = err.message;
      });
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        fieldErrors
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error returning asset',
      message: error.message
    });
  }
};

// Show return form
exports.showReturnForm = async (req, res) => {
  try {
    return res.render('asset-assignment/return-form');
  } catch (error) {
    console.error('Error loading return form:', error);
    return res.status(500).render('error', { error: 'Error loading return form' });
  }
};

// Scrap asset
exports.scrapAsset = async (req, res) => {
  try {
    const { asset_id, scrap_date, reason, method, employee_id } = req.body;
    
    // Validate required fields
    const fieldErrors = {};
    if (!asset_id) {
      fieldErrors.asset_id = 'Asset is required';
    }
    if (!scrap_date) {
      fieldErrors.scrap_date = 'Scrap date is required';
    }
    if (!reason || reason.trim() === '') {
      fieldErrors.reason = 'Reason is required';
    }
    if (!method) {
      fieldErrors.method = 'Scrap method is required';
    }
    if (!employee_id) {
      fieldErrors.employee_id = 'Employee is required';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        fieldErrors
      });
    }

    await withTransaction(async (transaction) => {
      const asset = await Asset.findByPk(asset_id, { transaction });
      
      if (!asset) {
        return res.status(400).json({
          success: false,
          error: 'Asset not found',
          fieldErrors: {
            asset_id: 'Selected asset not found'
          }
        });
      }

      if (asset.status === 'scrapped') {
        return res.status(400).json({
          success: false,
          error: 'Asset is already scrapped',
          fieldErrors: {
            asset_id: 'Asset is already scrapped'
          }
        });
      }

      if (asset.status === 'assigned') {
        const assignment = await AssetAssignment.findOne({
          where: { asset_id, status: 'assigned', return_date: null },
          transaction
        });

        if (assignment) {
          await assignment.update({
            status: 'returned',
            return_date: scrap_date,
            return_condition: 'damaged',
            notes: `Asset marked as scrapped. Reason: ${reason}. Method: ${method}.`
          }, { transaction });
        }
      }

      await asset.update({ status: 'scrapped' }, { transaction });

      await db.AssetHistory.create({
        asset_id,
        action_type: 'scrapped',
        action_date: scrap_date,
        performed_by: employee_id,
        notes: `Asset marked as scrapped. Reason: ${reason}. Method: ${method}.`
      }, { transaction });
    });

    return res.json({
      success: true,
      message: 'Asset has been marked as scrapped successfully'
    });
  } catch (error) {
    console.error('Error scrapping asset:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const fieldErrors = {};
      error.errors.forEach(err => {
        fieldErrors[err.path] = err.message;
      });
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        fieldErrors
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to scrap asset',
      message: error.message
    });
  }
};
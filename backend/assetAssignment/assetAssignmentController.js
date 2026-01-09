const db = require('../models');
const { Op } = require('sequelize');
const { Asset, Employee, AssetAssignment } = db;

// Helper functions
const sendResponse = (res, status, success, message, data = null) => {
  res.status(status).json({ success, message, ...(data && { data }) });
};

const sendError = (res, status, error, message = null) => {
  res.status(status).json({ success: false, error, ...(message && { message }) });
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
    const assignmentData = {
      ...req.body,
      assigned_date: req.body.assigned_date || new Date().toISOString().split('T')[0],
      status: 'assigned'
    };

    const assignment = await AssetAssignment.create(assignmentData);
    await updateAssetStatus(assignmentData.asset_id, 'assigned');

    sendResponse(res, 201, true, 'Asset assigned successfully', { data: assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
    sendError(res, 500, 'Error assigning asset', error.message);
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
    
    const assignment = await AssetAssignment.findOne({
      where: { employee_id, asset_id, status: 'assigned' }
    });
    
    if (!assignment) {
      return sendError(res, 404, 'Active assignment not found');
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

    sendResponse(res, 200, true, 'Asset returned successfully');
  } catch (error) {
    console.error('Error returning asset:', error);
    sendError(res, 500, 'Error returning asset', error.message);
  }
};

// Show return form
exports.showReturnForm = async (req, res) => {
  try {
    res.render('asset-assignment/return-form', {
      error: req.query.error,
      success: req.query.success
    });
  } catch (error) {
    console.error('Error loading return form:', error);
    res.render('asset-assignment/return-form', {
      error: req.query.error || 'Error loading return form'
    });
  }
};

// Scrap asset
exports.scrapAsset = async (req, res) => {
  try {
    const { asset_id, scrap_date, reason, method, notes } = req.body;
    
    if (!asset_id || !scrap_date || !reason || !method) {
      return sendError(res, 400, 'Please fill in all required fields: Asset, Scrap Date, Reason, and Method');
    }

    await withTransaction(async (transaction) => {
      const asset = await Asset.findByPk(asset_id, { transaction });
      
      if (!asset) {
        throw new Error('Asset not found');
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
            notes: `Asset marked as scrapped. ${notes || ''}`.trim()
          }, { transaction });
        }
      }

      await asset.update({ status: 'scrapped' }, { transaction });

      await db.AssetHistory.create({
        asset_id,
        action_type: 'scrapped',
        action_date: scrap_date,
        performed_by: req.user?.id || null,
        notes: `Asset marked as scrapped. Reason: ${reason}. Method: ${method}. ${notes || ''}`.trim()
      }, { transaction });
    });

    sendResponse(res, 200, true, 'Asset has been marked as scrapped successfully', { asset_id });
  } catch (error) {
    console.error('Error scrapping asset:', error);
    if (error.message === 'Asset not found') {
      return sendError(res, 404, 'Asset not found');
    }
    sendError(res, 500, 'Failed to scrap asset', error.message);
  }
};
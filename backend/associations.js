// Set up associations
const setupAssociations = (db) => {
  const { Asset, Employee, AssetAssignment, AssetCategory, AssetHistory } = db;
  
// Asset associations
  Asset.hasMany(AssetAssignment, { foreignKey: 'asset_id', as: 'assignments' });
  Asset.hasMany(AssetHistory, { foreignKey: 'asset_id', as: 'histories' });
  Asset.belongsTo(AssetCategory, { foreignKey: 'category_id', as: 'category' });
  
// Employee associations
  Employee.hasMany(AssetAssignment, { foreignKey: 'employee_id', as: 'assignments' });
  Employee.hasMany(AssetAssignment, { foreignKey: 'assigned_by', as: 'assignedAssets' });
  Employee.hasMany(AssetHistory, { foreignKey: 'employee_id', as: 'assetHistories' });
  Employee.hasMany(AssetHistory, { foreignKey: 'performed_by', as: 'performedHistories' });
  
// AssetAssignment associations
  AssetAssignment.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
  AssetAssignment.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
  AssetAssignment.belongsTo(Employee, { foreignKey: 'assigned_by', as: 'assignedBy' });
  
// AssetHistory associations
  AssetHistory.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
  AssetHistory.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
  AssetHistory.belongsTo(Employee, { foreignKey: 'performed_by', as: 'performedBy' });
  
// AssetCategory associations
  AssetCategory.hasMany(Asset, { foreignKey: 'category_id', as: 'assets' });
  
};

module.exports = {
  setupAssociations
};

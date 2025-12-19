const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const db = {};
const { sequelize } = require('../config/db');

// Import models from models directory
const modelFiles = fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  });

// Import models from feature directories
const featureDirs = ['asset', 'employee', 'assetAssignment', 'assetCategories', 'assetHistory'];
const featureModels = [];

featureDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('Model.js'));
    files.forEach(file => {
      featureModels.push(path.join(dirPath, file));
    });
  }
});

// First, import all models from models directory
modelFiles.forEach(file => {
  const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
});

// Then, import all models from feature directories
featureModels.forEach(filePath => {
  const model = require(filePath)(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
});

// Then, set up associations for all models
const { setupAssociations } = require('../associations');
setupAssociations(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

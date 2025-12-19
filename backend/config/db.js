const { Sequelize } = require('sequelize');
require('dotenv').config({ quiet: true });

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'kt_task',
  process.env.DB_USER || 'postgres', 
  process.env.DB_PASSWORD || 'prasanna',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: false,
    define: {
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
//import models 
    const db = require('./models');
    
// Sync all models with the database
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');
    
    return db;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB
};

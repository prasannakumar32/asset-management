const { Sequelize } = require('sequelize');
require('dotenv').config({ quiet: true });

// Database configuration for different environments
const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    // Production database (Render/Heroku)
    // Check if DATABASE_URL is provided (common on Render/Heroku)
    if (process.env.DATABASE_URL) {
      return {
        url: process.env.DATABASE_URL,
        dialect: 'postgres',
        logging: false,
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
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
      };
    }
    
    // Fallback to individual environment variables
    return {
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
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
    };
  } else {
    // Local development database
    return {
      database: process.env.DB_NAME || 'kt_task',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'prasanna',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log,
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
    };
  }
};

// Create Sequelize instance
const sequelize = new Sequelize(getDatabaseConfig());

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

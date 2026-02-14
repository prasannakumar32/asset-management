const { Sequelize } = require('sequelize');
require('dotenv').config({ quiet: true });

// Database configuration for different environments
const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    // Production database - try multiple methods
    
    // Method 1: DATABASE_URL (most common)
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL for production');

      const rawUrl = process.env.DATABASE_URL;
      console.log('Original DATABASE_URL length:', rawUrl.length);

      // Ensure protocol is present so URL parser works with values like "user:pass@host:port/db"
      let normalizedUrl = rawUrl;
      if (!normalizedUrl.startsWith('postgres://') && !normalizedUrl.startsWith('postgresql://')) {
        normalizedUrl = 'postgres://' + normalizedUrl;
        console.log('Normalized DATABASE_URL to include protocol');
      }

      try {
        const { URL } = require('url');
        const parsed = new URL(normalizedUrl);

        const username = decodeURIComponent(parsed.username || '');
        const password = decodeURIComponent(parsed.password || '');
        const host = parsed.hostname;
        const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
        const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';

        return {
          database,
          username,
          password,
          host,
          port,
          dialect: 'postgres',
          logging: false,
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
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
      } catch (err) {
        console.error('Failed to parse DATABASE_URL:', err);
        throw err;
      }
    }
    
    // Method 2: Individual environment variables (manual setup)
    if (process.env.PGDATABASE && process.env.PGHOST) {
      console.log('Using individual PG env vars for production');
      return {
        database: process.env.PGDATABASE,
        username: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: process.env.PGHOST,
        port: process.env.PGPORT || 5432,
        dialect: 'postgres',
        logging: false,
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
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
    
    // Method 3: Custom env vars (alternative manual setup)
    if (process.env.DB_HOST && process.env.DB_NAME) {
      console.log('Using custom DB env vars for production');
      return {
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
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
    
    // Method 4: Fallback to error with helpful message
    console.log('No database configuration found in production environment');
    console.log('Please set one of the following in your Render dashboard:');
    console.log('1. DATABASE_URL (recommended)');
    console.log('2. PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE');
    console.log('3. DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
    
    throw new Error('No database configuration found. Please set DATABASE_URL or individual database environment variables in Render dashboard.');
    
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

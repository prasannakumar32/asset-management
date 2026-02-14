const bcrypt = require('bcryptjs');
const db = require('../backend/models');

const createAdminUser = async (closeAfter = true) => {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.User.findOne({ 
      where: { username: 'admin' } 
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }

    // Create admin user
    const adminUser = await db.User.create({
      username: 'admin',
      email: 'admin@assettracker.com',
      password: 'admin123', // Will be hashed automatically
      role: 'admin',
      is_active: true
    });

    console.log('Admin user created successfully:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@assettracker.com');
    console.log('Role: admin');

    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    // Only close the shared Sequelize connection when this script is executed directly
    if (closeAfter && require.main === module) {
      await db.sequelize.close();
    }
  }
};

// Run if called directly
if (require.main === module) {
  createAdminUser(true);
}

module.exports = createAdminUser;

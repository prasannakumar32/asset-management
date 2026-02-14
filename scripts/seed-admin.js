const bcrypt = require('bcryptjs');
const db = require('../backend/models');

const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.User.findOne({ 
      where: { username: 'admin' } 
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
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

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await db.sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;

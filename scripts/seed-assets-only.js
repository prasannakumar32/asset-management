const db = require('../backend/models');

const seedAssetsOnly = async () => {
  try {
    // Check if we already have assets
    const existingAssets = await db.Asset.count();
    if (existingAssets > 0) {
      console.log('Assets already exist, skipping asset creation');
      return;
    }

    // Get existing categories or create them
    let categories = await db.AssetCategory.findAll();
    if (categories.length === 0) {
      categories = await db.AssetCategory.bulkCreate([
        {
          name: 'Laptops',
          description: 'Company laptops'
        },
        {
          name: 'Monitors',
          description: 'Computer monitors'
        },
        {
          name: 'Phones',
          description: 'Mobile phones'
        }
      ]);
    }

    // Get existing employees
    const employees = await db.Employee.findAll();
    if (employees.length === 0) {
      console.log('No employees found. Please run seed-admin first.');
      return;
    }

    // Create sample assets
    const assets = await db.Asset.bulkCreate([
      {
        name: 'Dell Latitude 5420',
        asset_tag: 'LAP001',
        serial_number: 'DL123456789',
        category_id: categories[0].id,
        status: 'available',
        purchase_date: new Date('2023-01-15'),
        purchase_cost: 1200,
        is_active: true
      },
      {
        name: 'HP EliteDisplay E243',
        asset_tag: 'MON001',
        serial_number: 'HP987654321',
        category_id: categories[1].id,
        status: 'available',
        purchase_date: new Date('2023-02-20'),
        purchase_cost: 300,
        is_active: true
      },
      {
        name: 'iPhone 13',
        asset_tag: 'PHN001',
        serial_number: 'AP112233445',
        category_id: categories[2].id,
        status: 'assigned',
        purchase_date: new Date('2023-03-10'),
        purchase_cost: 800,
        is_active: true
      }
    ]);

    // Create sample asset assignment
    if (assets.length > 0 && employees.length > 0) {
      await db.AssetAssignment.create({
        asset_id: assets[2].id, // iPhone 13
        employee_id: employees[0].id, // First employee
        assigned_by: employees[0].id, // Assigned by first employee
        assigned_date: new Date('2023-03-15'),
        status: 'assigned',
        notes: 'Assigned for work purposes'
      });
    }

    console.log('Sample assets created successfully!');
    console.log(`Created ${assets.length} assets`);
    console.log('Created 1 asset assignment');

  } catch (error) {
    console.error('Error creating sample assets:', error);
  } finally {
    await db.sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedAssetsOnly();
}

module.exports = seedAssetsOnly;

const db = require('../backend/models');

const seedAssetsOnly = async (closeAfter = true) => {
  try {
    // Ensure categories exist (idempotent)
    const sampleCategories = [
      { name: 'Laptops', description: 'Company laptops' },
      { name: 'Monitors', description: 'Computer monitors' },
      { name: 'Phones', description: 'Mobile phones' }
    ];

    const categories = [];
    for (const cat of sampleCategories) {
      const [instance] = await db.AssetCategory.findOrCreate({
        where: { name: cat.name },
        defaults: cat
      });
      categories.push(instance);
    }

    // Get existing employees
    const employees = await db.Employee.findAll();
    if (employees.length === 0) {
      console.log('No employees found. Please run seed-admin first.');
      return;
    }

    // Create or find sample assets (idempotent by asset_tag)
    const sampleAssets = [
      {
        name: 'Dell Latitude 5420',
        asset_tag: 'LAP001',
        serial_number: 'DL123456789',
        category_id: categories[0].id,
        status: 'available',
        purchase_date: '2023-01-15',
        purchase_cost: 1200,
        is_active: true
      },
      {
        name: 'HP EliteDisplay E243',
        asset_tag: 'MON001',
        serial_number: 'HP987654321',
        category_id: categories[1].id,
        status: 'available',
        purchase_date: '2023-02-20',
        purchase_cost: 300,
        is_active: true
      },
      {
        name: 'iPhone 13',
        asset_tag: 'PHN001',
        serial_number: 'AP112233445',
        category_id: categories[2].id,
        status: 'assigned',
        purchase_date: '2023-03-10',
        purchase_cost: 800,
        is_active: true
      }
    ];

    const createdAssets = [];
    for (const a of sampleAssets) {
      const [asset] = await db.Asset.findOrCreate({
        where: { asset_tag: a.asset_tag },
        defaults: a
      });
      createdAssets.push(asset);
    }

    // Create sample asset assignment if not exists
    const phone = createdAssets.find(x => x.asset_tag === 'PHN001');
    if (phone) {
      const employee = employees[0];
      const existing = await db.AssetAssignment.findOne({
        where: { asset_id: phone.id, employee_id: employee.id }
      });
      if (!existing) {
        await db.AssetAssignment.create({
          asset_id: phone.id,
          employee_id: employee.id,
          assigned_by: employee.id,
          assigned_date: '2023-03-15',
          status: 'assigned',
          notes: 'Assigned for work purposes'
        });
      }
    }

    console.log('Sample assets ensured (idempotent)');
    return createdAssets;
  } catch (error) {
    console.error('Error creating sample assets:', error);
    throw error;
  } finally {
    if (closeAfter) {
      await db.sequelize.close();
    }
  }
};

// Run if called directly
if (require.main === module) {
  seedAssetsOnly(true);
}

module.exports = seedAssetsOnly;

const db = require('../backend/models');

const seedAssetsOnly = async (closeAfter = true) => {
  try {
    // Ensure categories exist (idempotent)
    const sampleCategories = [
      { name: 'Laptops', description: 'Company laptops' },
      { name: 'Monitors', description: 'Computer monitors' },
      { name: 'Phones', description: 'Mobile phones' },
      { name: 'Peripherals', description: 'Keyboards, mice, docks and accessories' }
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
      { name: 'Dell Latitude 5420', asset_tag: 'LAP001', serial_number: 'DL123456789', category_id: categories[0].id, status: 'available', purchase_date: '2023-01-15', purchase_cost: 1200, is_active: true },
      { name: 'Dell XPS 13', asset_tag: 'LAP002', serial_number: 'DX13234567', category_id: categories[0].id, status: 'available', purchase_date: '2023-04-10', purchase_cost: 1400, is_active: true },
      { name: 'Lenovo ThinkPad T14', asset_tag: 'LAP003', serial_number: 'LT14098765', category_id: categories[0].id, status: 'assigned', purchase_date: '2023-05-22', purchase_cost: 1300, is_active: true },
      { name: 'MacBook Pro 14', asset_tag: 'LAP004', serial_number: 'MBP1401122', category_id: categories[0].id, status: 'available', purchase_date: '2024-01-12', purchase_cost: 2200, is_active: true },
      { name: 'HP EliteDisplay E243', asset_tag: 'MON001', serial_number: 'HP987654321', category_id: categories[1].id, status: 'available', purchase_date: '2023-02-20', purchase_cost: 300, is_active: true },
      { name: 'LG UltraFine 27', asset_tag: 'MON002', serial_number: 'LG27123456', category_id: categories[1].id, status: 'available', purchase_date: '2023-06-18', purchase_cost: 450, is_active: true },
      { name: 'iPhone 13', asset_tag: 'PHN001', serial_number: 'AP112233445', category_id: categories[2].id, status: 'assigned', purchase_date: '2023-03-10', purchase_cost: 800, is_active: true },
      { name: 'iPhone 14', asset_tag: 'PHN002', serial_number: 'AP99887766', category_id: categories[2].id, status: 'available', purchase_date: '2024-02-01', purchase_cost: 999, is_active: true },
      { name: 'Mechanical Keyboard - MK100', asset_tag: 'KEY001', serial_number: 'MK100A1', category_id: categories[3].id, status: 'available', purchase_date: '2023-07-01', purchase_cost: 120, is_active: true },
      { name: 'Wireless Mouse - WM50', asset_tag: 'MOU001', serial_number: 'WM50001', category_id: categories[3].id, status: 'available', purchase_date: '2023-07-02', purchase_cost: 45, is_active: true },
      { name: 'USB-C Dock - DOK01', asset_tag: 'DOK001', serial_number: 'DOK001X', category_id: categories[3].id, status: 'available', purchase_date: '2023-07-05', purchase_cost: 200, is_active: true }
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
    // Only close the shared Sequelize connection when this script is executed directly
    if (closeAfter && require.main === module) {
      await db.sequelize.close();
    }
  }
};

// Run if called directly
if (require.main === module) {
  seedAssetsOnly(true);
}

module.exports = seedAssetsOnly;

const db = require('../backend/models');

const seedAssetsOnly = async (closeAfter = true) => {
  try {
    // Ensure categories exist (idempotent)
    const sampleCategories = [
      { name: 'Laptops', description: 'Company laptops' },
      { name: 'Phones', description: 'Mobile phones' },
      { name: 'Headphones', description: 'Audio/headset devices' },
      { name: 'Chargers', description: 'Chargers and power adapters' },
      { name: 'Printers', description: 'Printers and scanners' },
      { name: 'Network', description: 'WiFi routers, switches and network gear' },
      { name: 'Peripherals', description: 'Keyboards, mice, docks and accessories' },
      { name: 'Office Supplies', description: 'Office equipment and consumables' }
    ];

    const categories = [];
    for (const cat of sampleCategories) {
      await db.AssetCategory.upsert(cat);
      const instance = await db.AssetCategory.findOne({ where: { name: cat.name } });
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
      { name: 'Dell Latitude 5420', asset_tag: 'LAP001', serial_number: 'DL123456789', category_id: categories[0].id, status: 'available', purchase_date: '2023-01-15', purchase_cost: 1200, is_active: true, branch: 'Chennai', manufacturer: 'Dell', model: 'Latitude 5420' },
      { name: 'Lenovo ThinkPad T14', asset_tag: 'LAP002', serial_number: 'LT14098765', category_id: categories[0].id, status: 'assigned', purchase_date: '2023-05-22', purchase_cost: 1300, is_active: true, branch: 'Coimbatore', manufacturer: 'Lenovo', model: 'ThinkPad T14' },
      { name: 'MacBook Pro 14', asset_tag: 'LAP003', serial_number: 'MBP1401122', category_id: categories[0].id, status: 'available', purchase_date: '2024-01-12', purchase_cost: 2200, is_active: true, branch: 'Namakkal', manufacturer: 'Apple', model: 'MacBook Pro' },
      { name: 'iPhone 13', asset_tag: 'PHN001', serial_number: 'AP112233445', category_id: categories[1].id, status: 'assigned', purchase_date: '2023-03-10', purchase_cost: 800, is_active: true, branch: 'Chennai', manufacturer: 'Apple', model: 'iPhone 13' },
      { name: 'Samsung Galaxy S21', asset_tag: 'PHN002', serial_number: 'SMG21A001', category_id: categories[1].id, status: 'available', purchase_date: '2023-06-01', purchase_cost: 700, is_active: true, branch: 'Coimbatore', manufacturer: 'Samsung', model: 'Galaxy S21' },
      { name: 'Sony WH-1000XM4', asset_tag: 'HPH001', serial_number: 'SONYWH1000XM4', category_id: categories[2].id, status: 'assigned', purchase_date: '2023-02-20', purchase_cost: 300, is_active: true, branch: 'Namakkal', manufacturer: 'Sony', model: 'WH-1000XM4' },
      { name: 'Logitech MX Keys', asset_tag: 'PER001', serial_number: 'LOGMXK001', category_id: categories[6].id, status: 'available', purchase_date: '2023-07-01', purchase_cost: 120, is_active: true, branch: 'Chennai', manufacturer: 'Logitech', model: 'MX Keys' },
      { name: 'Logitech MX Master 3', asset_tag: 'PER002', serial_number: 'LOGMXM3001', category_id: categories[6].id, status: 'available', purchase_date: '2023-07-02', purchase_cost: 100, is_active: true, branch: 'Coimbatore', manufacturer: 'Logitech', model: 'MX Master 3' },
      { name: 'Anker PowerPort III', asset_tag: 'CHG001', serial_number: 'ANKERPWR03', category_id: categories[3].id, status: 'available', purchase_date: '2023-07-05', purchase_cost: 30, is_active: true, branch: 'Namakkal', manufacturer: 'Anker', model: 'PowerPort III' },
      { name: 'HP LaserJet Pro M428', asset_tag: 'PRN001', serial_number: 'HPLJPRO428', category_id: categories[4].id, status: 'available', purchase_date: '2022-11-10', purchase_cost: 450, is_active: true, branch: 'Chennai', manufacturer: 'HP', model: 'LaserJet Pro M428' },
      { name: 'TP-Link Archer C7', asset_tag: 'NET001', serial_number: 'TPLINKARC7', category_id: categories[5].id, status: 'available', purchase_date: '2022-10-05', purchase_cost: 80, is_active: true, branch: 'Coimbatore', manufacturer: 'TP-Link', model: 'Archer C7' },
      { name: 'Swingline Stapler', asset_tag: 'OFC001', serial_number: 'SWINGSTPLR1', category_id: categories[7].id, status: 'available', purchase_date: '2023-01-05', purchase_cost: 15, is_active: true, branch: 'Namakkal', manufacturer: 'Swingline', model: 'Stapler' }
    ];

    const createdAssets = [];
    for (const a of sampleAssets) {
      // copy and ensure category_id/branch present
      const assetData = Object.assign({}, a, { category_id: a.category_id, branch: a.branch || 'Headquarters' });
      await db.Asset.upsert(assetData);
      const asset = await db.Asset.findOne({ where: { asset_tag: a.asset_tag } });
      createdAssets.push(asset);
    }

    // Create sample asset assignment if not exists
    const phone = createdAssets.find(x => x.asset_tag === 'PHN001');
    if (phone) {
      const employee = employees[0];
      // If the asset already has an assignment (to any employee) skip creating another
      const existing = await db.AssetAssignment.findOne({
        where: { asset_id: phone.id }
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

const db = require('../backend/models');

const seedSampleData = async (closeAfter = true) => {
  try {
    // Employees - idempotent: upsert / findOrCreate by employee_id
    const sampleEmployees = [
      { employee_id: 'EMP001', first_name: 'Prasanna', last_name: 'Kumar', email: 'prasanna@company.com', phone: '9840012345', department: 'IT', position: 'Software Developer', hire_date: '2022-03-01', branch: 'Chennai', status: 'active' },
      { employee_id: 'EMP002', first_name: 'Pravin', last_name: 'Kumar', email: 'pravin@company.com', phone: '9840022345', department: 'IT', position: 'DevOps Engineer', hire_date: '2022-06-15', branch: 'Coimbatore', status: 'active' },
      { employee_id: 'EMP003', first_name: 'Dinesh', last_name: 'R', email: 'dinesh@company.com', phone: '9840032345', department: 'Support', position: 'Support Engineer', hire_date: '2023-01-10', branch: 'Namakkal', status: 'active' },
      { employee_id: 'EMP004', first_name: 'Rajesh', last_name: 'S', email: 'rajesh@company.com', phone: '9840042345', department: 'Sales', position: 'Sales Executive', hire_date: '2023-02-20', branch: 'Chennai', status: 'active' },
      { employee_id: 'EMP005', first_name: 'Elango', last_name: 'M', email: 'elango@company.com', phone: '9840052345', department: 'HR', position: 'HR Manager', hire_date: '2023-04-01', branch: 'Coimbatore', status: 'active' },
      { employee_id: 'EMP006', first_name: 'Rahul', last_name: 'K', email: 'rahul@company.com', phone: '9840062345', department: 'Finance', position: 'Accountant', hire_date: '2023-05-12', branch: 'Namakkal', status: 'active' },
      { employee_id: 'EMP007', first_name: 'Arun', last_name: 'V', email: 'arun@company.com', phone: '9840072345', department: 'Product', position: 'Product Manager', hire_date: '2023-07-10', branch: 'Chennai', status: 'active' },
      { employee_id: 'EMP008', first_name: 'Karthik', last_name: 'P', email: 'karthik@company.com', phone: '9840082345', department: 'QA', position: 'QA Engineer', hire_date: '2023-08-15', branch: 'Coimbatore', status: 'active' },
      { employee_id: 'EMP009', first_name: 'Naveen', last_name: 'S', email: 'naveen@company.com', phone: '9840092345', department: 'DevOps', position: 'DevOps Engineer', hire_date: '2023-09-01', branch: 'Namakkal', status: 'active' },
      { employee_id: 'EMP010', first_name: 'Suresh', last_name: 'R', email: 'suresh@company.com', phone: '9840102345', department: 'Marketing', position: 'Marketing Lead', hire_date: '2023-10-05', branch: 'Chennai', status: 'active' }
    ];

    const employees = [];
    for (const emp of sampleEmployees) {
      // upsert so existing records are updated to match the requested sample data
      await db.Employee.upsert(emp);
      const instance = await db.Employee.findOne({ where: { employee_id: emp.employee_id } });
      employees.push(instance);
    }

    // Categories - idempotent by name
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

    // Assets - idempotent by asset_tag
    const sampleAssets = [
      { name: 'Dell Latitude 5420', asset_tag: 'LAP001', serial_number: 'DL123456789', category_name: 'Laptops', status: 'available', purchase_date: '2023-01-15', purchase_cost: 1200, is_active: true, branch: 'Chennai', manufacturer: 'Dell', model: 'Latitude 5420' },
      { name: 'Lenovo ThinkPad T14', asset_tag: 'LAP002', serial_number: 'LT14098765', category_name: 'Laptops', status: 'assigned', purchase_date: '2023-05-22', purchase_cost: 1300, is_active: true, branch: 'Coimbatore', manufacturer: 'Lenovo', model: 'ThinkPad T14' },
      { name: 'MacBook Pro 14', asset_tag: 'LAP003', serial_number: 'MBP1401122', category_name: 'Laptops', status: 'available', purchase_date: '2024-01-12', purchase_cost: 2200, is_active: true, branch: 'Namakkal', manufacturer: 'Apple', model: 'MacBook Pro' },
      { name: 'iPhone 13', asset_tag: 'PHN001', serial_number: 'AP112233445', category_name: 'Phones', status: 'assigned', purchase_date: '2023-03-10', purchase_cost: 800, is_active: true, branch: 'Chennai', manufacturer: 'Apple', model: 'iPhone 13' },
      { name: 'Samsung Galaxy S21', asset_tag: 'PHN002', serial_number: 'SMG21A001', category_name: 'Phones', status: 'available', purchase_date: '2023-06-01', purchase_cost: 700, is_active: true, branch: 'Coimbatore', manufacturer: 'Samsung', model: 'Galaxy S21' },
      { name: 'Sony WH-1000XM4', asset_tag: 'HPH001', serial_number: 'SONYWH1000XM4', category_name: 'Headphones', status: 'assigned', purchase_date: '2023-02-20', purchase_cost: 300, is_active: true, branch: 'Namakkal', manufacturer: 'Sony', model: 'WH-1000XM4' },
      { name: 'Logitech MX Keys', asset_tag: 'PER001', serial_number: 'LOGMXK001', category_name: 'Peripherals', status: 'available', purchase_date: '2023-07-01', purchase_cost: 120, is_active: true, branch: 'Chennai', manufacturer: 'Logitech', model: 'MX Keys' },
      { name: 'Logitech MX Master 3', asset_tag: 'PER002', serial_number: 'LOGMXM3001', category_name: 'Peripherals', status: 'available', purchase_date: '2023-07-02', purchase_cost: 100, is_active: true, branch: 'Coimbatore', manufacturer: 'Logitech', model: 'MX Master 3' },
      { name: 'Anker PowerPort III', asset_tag: 'CHG001', serial_number: 'ANKERPWR03', category_name: 'Chargers', status: 'available', purchase_date: '2023-07-05', purchase_cost: 30, is_active: true, branch: 'Namakkal', manufacturer: 'Anker', model: 'PowerPort III' },
      { name: 'HP LaserJet Pro M428', asset_tag: 'PRN001', serial_number: 'HPLJPRO428', category_name: 'Printers', status: 'available', purchase_date: '2022-11-10', purchase_cost: 450, is_active: true, branch: 'Chennai', manufacturer: 'HP', model: 'LaserJet Pro M428' },
      { name: 'TP-Link Archer C7', asset_tag: 'NET001', serial_number: 'TPLINKARC7', category_name: 'Network', status: 'available', purchase_date: '2022-10-05', purchase_cost: 80, is_active: true, branch: 'Coimbatore', manufacturer: 'TP-Link', model: 'Archer C7' },
      { name: 'Swingline Stapler', asset_tag: 'OFC001', serial_number: 'SWINGSTPLR1', category_name: 'Office Supplies', status: 'available', purchase_date: '2023-01-05', purchase_cost: 15, is_active: true, branch: 'Namakkal', manufacturer: 'Swingline', model: 'Stapler' }
    ];

    const assets = [];
    for (const a of sampleAssets) {
      const category = categories.find(c => c.name === a.category_name);

      // ensure category_id is set for upsert
      const assetData = {
        name: a.name,
        asset_tag: a.asset_tag,
        serial_number: a.serial_number,
        category_id: category ? category.id : null,
        status: a.status,
        purchase_date: a.purchase_date,
        purchase_cost: a.purchase_cost,
        is_active: a.is_active,
        branch: a.branch || 'Headquarters',
        model: a.model || null,
        manufacturer: a.manufacturer || null
      };

      await db.Asset.upsert(assetData);
      const asset = await db.Asset.findOne({ where: { asset_tag: a.asset_tag } });
      assets.push(asset);
    }

    // Asset assignments - idempotent: create multiple realistic assignments
    const assignmentMap = [
      { asset_tag: 'PHN001', employee_index: 0, assigned_date: '2023-03-15' },
      { asset_tag: 'LAP002', employee_index: 1, assigned_date: '2023-05-22' },
      { asset_tag: 'LAP003', employee_index: 2, assigned_date: '2024-01-15' },
      { asset_tag: 'PRN001', employee_index: 3, assigned_date: '2022-12-01' },
      { asset_tag: 'PER002', employee_index: 4, assigned_date: '2023-07-10' },
      { asset_tag: 'HPH001', employee_index: 5, assigned_date: '2023-02-25' }
    ];

    for (const map of assignmentMap) {
      const asset = assets.find(x => x.asset_tag === map.asset_tag);
      const employee = employees[map.employee_index] || employees[0];
      if (!asset || !employee) continue;

      const existing = await db.AssetAssignment.findOne({
        where: { asset_id: asset.id, employee_id: employee.id }
      });
      if (!existing) {
        await db.AssetAssignment.create({
          asset_id: asset.id,
          employee_id: employee.id,
          assigned_by: employee.id,
          assigned_date: map.assigned_date,
          status: 'assigned',
          notes: 'Seeded asset assignment'
        });
      }
    }

    console.log('Sample data created or already present (idempotent)');
    return { employees, categories, assets };
  } catch (error) {
    console.error('Error creating sample data:', error);
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
  seedSampleData(true);
}

module.exports = seedSampleData;

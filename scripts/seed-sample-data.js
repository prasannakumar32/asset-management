const db = require('../backend/models');

const seedSampleData = async (closeAfter = true) => {
  try {
    // Employees - idempotent: upsert / findOrCreate by employee_id
    const sampleEmployees = [
      { employee_id: 'EMP001', first_name: 'John', last_name: 'Doe', email: 'john@company.com', phone: '123-456-7890', department: 'IT', position: 'Software Developer', hire_date: '2023-01-15', branch: 'Headquarters', status: 'active' },
      { employee_id: 'EMP002', first_name: 'Jane', last_name: 'Smith', email: 'jane@company.com', phone: '098-765-4321', department: 'HR', position: 'HR Manager', hire_date: '2023-02-20', branch: 'Headquarters', status: 'active' },
      { employee_id: 'EMP003', first_name: 'Mike', last_name: 'Johnson', email: 'mike@company.com', phone: '555-123-4567', department: 'Finance', position: 'Accountant', hire_date: '2023-03-10', branch: 'Headquarters', status: 'active' },
      { employee_id: 'EMP004', first_name: 'Alice', last_name: 'Brown', email: 'alice@company.com', phone: '321-654-0987', department: 'Support', position: 'Support Engineer', hire_date: '2023-04-01', branch: 'Headquarters', status: 'active' },
      { employee_id: 'EMP005', first_name: 'Bob', last_name: 'Martin', email: 'bob@company.com', phone: '222-333-4444', department: 'Sales', position: 'Sales Executive', hire_date: '2023-05-12', branch: 'Branch A', status: 'active' },
      { employee_id: 'EMP006', first_name: 'Carol', last_name: 'Lee', email: 'carol@company.com', phone: '777-888-9999', department: 'Marketing', position: 'Marketing Lead', hire_date: '2023-06-01', branch: 'Branch B', status: 'active' },
      { employee_id: 'EMP007', first_name: 'David', last_name: 'Kim', email: 'david@company.com', phone: '444-555-6666', department: 'DevOps', position: 'DevOps Engineer', hire_date: '2023-07-10', branch: 'Headquarters', status: 'active' },
      { employee_id: 'EMP008', first_name: 'Eva', last_name: 'Green', email: 'eva@company.com', phone: '111-222-3333', department: 'QA', position: 'QA Engineer', hire_date: '2023-08-15', branch: 'Headquarters', status: 'active' },
      { employee_id: 'EMP009', first_name: 'Frank', last_name: 'White', email: 'frank@company.com', phone: '999-000-1111', department: 'Finance', position: 'Financial Analyst', hire_date: '2023-09-01', branch: 'Headquarters', status: 'active' },
      { employee_id: 'EMP010', first_name: 'Grace', last_name: 'Park', email: 'grace@company.com', phone: '666-777-8888', department: 'Product', position: 'Product Manager', hire_date: '2023-10-05', branch: 'Headquarters', status: 'active' }
    ];

    const employees = [];
    for (const emp of sampleEmployees) {
      const [instance] = await db.Employee.findOrCreate({
        where: { employee_id: emp.employee_id },
        defaults: emp
      });
      employees.push(instance);
    }

    // Categories - idempotent by name
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

    // Assets - idempotent by asset_tag
    const sampleAssets = [
      { name: 'Dell Latitude 5420', asset_tag: 'LAP001', serial_number: 'DL123456789', category_name: 'Laptops', status: 'available', purchase_date: '2023-01-15', purchase_cost: 1200, is_active: true },
      { name: 'Dell XPS 13', asset_tag: 'LAP002', serial_number: 'DX13234567', category_name: 'Laptops', status: 'available', purchase_date: '2023-04-10', purchase_cost: 1400, is_active: true },
      { name: 'Lenovo ThinkPad T14', asset_tag: 'LAP003', serial_number: 'LT14098765', category_name: 'Laptops', status: 'assigned', purchase_date: '2023-05-22', purchase_cost: 1300, is_active: true },
      { name: 'MacBook Pro 14', asset_tag: 'LAP004', serial_number: 'MBP1401122', category_name: 'Laptops', status: 'available', purchase_date: '2024-01-12', purchase_cost: 2200, is_active: true },
      { name: 'HP EliteDisplay E243', asset_tag: 'MON001', serial_number: 'HP987654321', category_name: 'Monitors', status: 'available', purchase_date: '2023-02-20', purchase_cost: 300, is_active: true },
      { name: 'LG UltraFine 27', asset_tag: 'MON002', serial_number: 'LG27123456', category_name: 'Monitors', status: 'available', purchase_date: '2023-06-18', purchase_cost: 450, is_active: true },
      { name: 'iPhone 13', asset_tag: 'PHN001', serial_number: 'AP112233445', category_name: 'Phones', status: 'assigned', purchase_date: '2023-03-10', purchase_cost: 800, is_active: true },
      { name: 'iPhone 14', asset_tag: 'PHN002', serial_number: 'AP99887766', category_name: 'Phones', status: 'available', purchase_date: '2024-02-01', purchase_cost: 999, is_active: true },
      { name: 'Mechanical Keyboard - MK100', asset_tag: 'KEY001', serial_number: 'MK100A1', category_name: 'Peripherals', status: 'available', purchase_date: '2023-07-01', purchase_cost: 120, is_active: true },
      { name: 'Wireless Mouse - WM50', asset_tag: 'MOU001', serial_number: 'WM50001', category_name: 'Peripherals', status: 'available', purchase_date: '2023-07-02', purchase_cost: 45, is_active: true },
      { name: 'USB-C Dock - DOK01', asset_tag: 'DOK001', serial_number: 'DOK001X', category_name: 'Peripherals', status: 'available', purchase_date: '2023-07-05', purchase_cost: 200, is_active: true }
    ];

    const assets = [];
    for (const a of sampleAssets) {
      const category = categories.find(c => c.name === a.category_name);
      const [asset] = await db.Asset.findOrCreate({
        where: { asset_tag: a.asset_tag },
        defaults: {
          name: a.name,
          asset_tag: a.asset_tag,
          serial_number: a.serial_number,
          category_id: category ? category.id : null,
          status: a.status,
          purchase_date: a.purchase_date,
          purchase_cost: a.purchase_cost,
          is_active: a.is_active,
          branch: 'Headquarters'
        }
      });
      assets.push(asset);
    }

    // Asset assignments - idempotent: create multiple realistic assignments
    const assignmentMap = [
      { asset_tag: 'PHN001', employee_index: 0, assigned_date: '2023-03-15' },
      { asset_tag: 'LAP003', employee_index: 6, assigned_date: '2023-08-10' },
      { asset_tag: 'LAP002', employee_index: 3, assigned_date: '2023-04-20' },
      { asset_tag: 'MON002', employee_index: 4, assigned_date: '2023-06-25' },
      { asset_tag: 'PHN002', employee_index: 5, assigned_date: '2024-02-10' },
      { asset_tag: 'KEY001', employee_index: 7, assigned_date: '2023-07-10' }
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

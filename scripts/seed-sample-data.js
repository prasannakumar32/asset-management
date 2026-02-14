const db = require('../backend/models');

const seedSampleData = async (closeAfter = true) => {
  try {
    // Employees - idempotent: upsert / findOrCreate by employee_id
    const sampleEmployees = [
      {
        employee_id: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@company.com',
        phone: '123-456-7890',
        department: 'IT',
        position: 'Software Developer',
        hire_date: '2023-01-15',
        branch: 'Headquarters',
        status: 'active'
      },
      {
        employee_id: 'EMP002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@company.com',
        phone: '098-765-4321',
        department: 'HR',
        position: 'HR Manager',
        hire_date: '2023-02-20',
        branch: 'Headquarters',
        status: 'active'
      },
      {
        employee_id: 'EMP003',
        first_name: 'Mike',
        last_name: 'Johnson',
        email: 'mike@company.com',
        phone: '555-123-4567',
        department: 'Finance',
        position: 'Accountant',
        hire_date: '2023-03-10',
        branch: 'Headquarters',
        status: 'active'
      }
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

    // Assets - idempotent by asset_tag
    const sampleAssets = [
      {
        name: 'Dell Latitude 5420',
        asset_tag: 'LAP001',
        serial_number: 'DL123456789',
        category_name: 'Laptops',
        status: 'available',
        purchase_date: '2023-01-15',
        purchase_cost: 1200,
        is_active: true
      },
      {
        name: 'HP EliteDisplay E243',
        asset_tag: 'MON001',
        serial_number: 'HP987654321',
        category_name: 'Monitors',
        status: 'available',
        purchase_date: '2023-02-20',
        purchase_cost: 300,
        is_active: true
      },
      {
        name: 'iPhone 13',
        asset_tag: 'PHN001',
        serial_number: 'AP112233445',
        category_name: 'Phones',
        status: 'assigned',
        purchase_date: '2023-03-10',
        purchase_cost: 800,
        is_active: true
      }
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

    // Asset assignments - idempotent: only create if exact mapping doesn't exist
    for (const a of assets) {
      if (a.asset_tag === 'PHN001') {
        const employee = employees[0]; // John Doe
        const existing = await db.AssetAssignment.findOne({
          where: { asset_id: a.id, employee_id: employee.id }
        });
        if (!existing) {
          await db.AssetAssignment.create({
            asset_id: a.id,
            employee_id: employee.id,
            assigned_by: employee.id,
            assigned_date: '2023-03-15',
            status: 'assigned',
            notes: 'Assigned for work purposes'
          });
        }
      }
    }

    console.log('Sample data created or already present (idempotent)');
    return { employees, categories, assets };
  } catch (error) {
    console.error('Error creating sample data:', error);
    throw error;
  } finally {
    if (closeAfter) {
      await db.sequelize.close();
    }
  }
};

// Run if called directly
if (require.main === module) {
  seedSampleData(true);
}

module.exports = seedSampleData;

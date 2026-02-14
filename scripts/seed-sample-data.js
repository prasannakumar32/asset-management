const db = require('../backend/models');

const seedSampleData = async () => {
  try {
    // Create sample employees
    const employees = await db.Employee.bulkCreate([
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
    ]);

    // Create sample asset categories
    const categories = await db.AssetCategory.bulkCreate([
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

    // Create sample asset assignments
    await db.AssetAssignment.bulkCreate([
      {
        asset_id: assets[2].id, // iPhone 13
        employee_id: employees[0].id, // John Doe
        assigned_by: employees[0].id, // Assigned by John Doe himself
        assigned_date: new Date('2023-03-15'),
        status: 'assigned',
        notes: 'Assigned for work purposes'
      }
    ]);

    console.log('Sample data created successfully!');
    console.log(`Created ${employees.length} employees`);
    console.log(`Created ${categories.length} categories`);
    console.log(`Created ${assets.length} assets`);
    console.log(`Created 1 asset assignment`);

  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await db.sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedSampleData();
}

module.exports = seedSampleData;

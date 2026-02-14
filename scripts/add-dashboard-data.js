const db = require('../backend/models');

const addDashboardData = async () => {
  try {
    console.log('Adding dashboard sample data...');
    
    // Check and add employees if needed
    const employeeCount = await db.Employee.count();
    if (employeeCount === 0) {
      console.log('Adding sample employees...');
      await db.Employee.bulkCreate([
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
      console.log('✅ Added 3 employees');
    } else {
      console.log(`✅ Found ${employeeCount} existing employees`);
    }

    // Check and add asset categories if needed
    const categoryCount = await db.AssetCategory.count();
    if (categoryCount === 0) {
      console.log('Adding sample asset categories...');
      await db.AssetCategory.bulkCreate([
        { name: 'Laptops', description: 'Company laptops' },
        { name: 'Monitors', description: 'Computer monitors' },
        { name: 'Phones', description: 'Mobile phones' }
      ]);
      console.log('✅ Added 3 asset categories');
    } else {
      console.log(`✅ Found ${categoryCount} existing asset categories`);
    }

    // Get categories for asset creation
    const categories = await db.AssetCategory.findAll();
    
    // Check and add assets if needed
    const assetCount = await db.Asset.count();
    if (assetCount === 0) {
      console.log('Adding sample assets...');
      await db.Asset.bulkCreate([
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
        },
        {
          name: 'MacBook Pro 14"',
          asset_tag: 'LAP002',
          serial_number: 'MB456789123',
          category_id: categories[0].id,
          status: 'available',
          purchase_date: new Date('2023-04-05'),
          purchase_cost: 2000,
          is_active: true
        },
        {
          name: 'Samsung Galaxy S23',
          asset_tag: 'PHN002',
          serial_number: 'SG789456123',
          category_id: categories[2].id,
          status: 'assigned',
          purchase_date: new Date('2023-05-12'),
          purchase_cost: 900,
          is_active: true
        }
      ]);
      console.log('✅ Added 5 assets');
    } else {
      console.log(`✅ Found ${assetCount} existing assets`);
    }

    // Get employees and assets for assignment creation
    const employees = await db.Employee.findAll();
    const assets = await db.Asset.findAll();
    
    // Check and add asset assignments if needed
    const assignmentCount = await db.AssetAssignment.count();
    if (assignmentCount === 0) {
      console.log('Adding sample asset assignments...');
      
      // Find assigned assets
      const assignedAssets = assets.filter(asset => asset.status === 'assigned');
      
      for (let i = 0; i < assignedAssets.length && i < employees.length; i++) {
        await db.AssetAssignment.create({
          asset_id: assignedAssets[i].id,
          employee_id: employees[i].id,
          assigned_by: employees[0].id, // Admin assigns
          assigned_date: new Date('2023-06-01'),
          status: 'assigned',
          notes: `Assigned to ${employees[i].first_name} ${employees[i].last_name}`
        });
      }
      
      console.log(`✅ Added ${assignedAssets.length} asset assignments`);
    } else {
      console.log(`✅ Found ${assignmentCount} existing asset assignments`);
    }

    // Show final counts
    const finalEmployeeCount = await db.Employee.count();
    const finalAssetCount = await db.Asset.count();
    const finalAssignedCount = await db.AssetAssignment.count({ 
      where: { status: 'assigned', return_date: null } 
    });
    const finalAvailableCount = await db.Asset.count({ 
      where: { status: 'available', is_active: true } 
    });

    console.log('\n📊 Dashboard Data Summary:');
    console.log(`👥 Employees: ${finalEmployeeCount}`);
    console.log(`💻 Total Assets: ${finalAssetCount}`);
    console.log(`📱 Assigned Assets: ${finalAssignedCount}`);
    console.log(`✅ Available Assets: ${finalAvailableCount}`);
    console.log('\n🎉 Dashboard data is ready!');

  } catch (error) {
    console.error('❌ Error adding dashboard data:', error);
  } finally {
    await db.sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  addDashboardData();
}

module.exports = addDashboardData;

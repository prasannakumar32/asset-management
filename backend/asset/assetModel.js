module.exports = (sequelize, DataTypes) => {
  const Asset = sequelize.define('Asset', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    asset_tag: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    serial_number: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'asset_categories',
        key: 'id'
      }
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true
    },
    manufacturer: {
      type: DataTypes.STRING,
      allowNull: true
    },
    purchase_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    purchase_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    warranty_months: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    current_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('available', 'assigned', 'maintenance', 'retired', 'scrapped'),
      defaultValue: 'available'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'assets',
    timestamps: true,
    underscored: true,
    paranoid: false
  });

  return Asset;
};


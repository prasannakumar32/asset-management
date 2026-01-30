module.exports = (sequelize, DataTypes) => {
  const AssetAssignment = sequelize.define('AssetAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    asset_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'assets',
        key: 'id'
      }
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
     assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    assigned_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    return_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    return_condition: {
      type: DataTypes.ENUM('good','poor','damaged','lost','stolen'),
      allowNull: true
    },
    return_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('assigned','returned','lost','stolen','damaged'),
      defaultValue: 'assigned'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'asset_assignments',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['asset_id'],
        where: {
          status: 'assigned'
        }
      }
    ]
  });

  return AssetAssignment;
};

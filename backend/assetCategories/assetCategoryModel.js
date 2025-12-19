module.exports = (sequelize, DataTypes) => {
  const AssetCategory = sequelize.define('AssetCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
     description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'asset_categories',
    timestamps: true,
    underscored: true,
    paranoid: false
  });

  return AssetCategory;
};


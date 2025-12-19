const bcrypt = require('bcryptjs');
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        const salt = bcrypt.genSaltSync(10);
        this.setDataValue('password', bcrypt.hashSync(value, salt));
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'user'),
      defaultValue: 'user'
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'employees',
        key: 'id'
      }
    },
    comparePassword: {
      type: DataTypes.VIRTUAL,
      get() {
        return (password) => {
          return bcrypt.compareSync(password, this.password);
        };
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: false
  });

  User.prototype.validPassword = function(password) {
    if (!password || !this.password) {
      return false;
    }
    return bcrypt.compareSync(password, this.password);
  };

  User.associate = (models) => {
    User.hasMany(models.AssetMaintenance, {foreignKey: 'user_id',as: 'maintenances'});
  };

  return User;
};

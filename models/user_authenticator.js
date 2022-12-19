'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_authenticator = sequelize.define('user_authenticator', {
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    type: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,

    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    role: DataTypes.INTEGER,
    phone_number: DataTypes.STRING,
    need_password_reset: { type: DataTypes.BOOLEAN, defaultValue: false },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.first_name || ''} ${this.last_name || ''}`;
      }
    },
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'password', 'updatedAt'] }
    }
  });
  user_authenticator.associate = function (models) {
    // associations can be defined here
    user_authenticator.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    })
    user_authenticator.hasOne(models.org_staff_permission, {
      foreignKey: 'staff_id', as: 'permissions'
    })
  };
  return user_authenticator;
};
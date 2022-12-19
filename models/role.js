'use strict';
module.exports = (sequelize, DataTypes) => {
  const role = sequelize.define('role', {
    role: DataTypes.STRING,
    group: DataTypes.INTEGER,
  }, {});
  role.associate = function (models) {
    // associations can be defined here
    role.hasMany(models.role_permission, {
      foreignKey: 'role_id',
      as: 'role_permissions'
    });
  };
  return role;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const role_permission = sequelize.define('role_permission', {
    role_id: DataTypes.INTEGER,
    permission_id: DataTypes.INTEGER,
    read: DataTypes.BOOLEAN,
    write: DataTypes.BOOLEAN,
    delete: DataTypes.BOOLEAN,
  }, {});
  role_permission.associate = function(models) {
    // associations can be defined here
    role_permission.belongsTo(models.permission, {
      foreignKey: 'permission_id',
      as: 'permission'
    });
  };
  return role_permission;
};
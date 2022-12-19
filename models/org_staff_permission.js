'use strict';
module.exports = (sequelize, DataTypes) => {
  const org_staff_permission = sequelize.define('org_staff_permission', {
    user_id: DataTypes.INTEGER,
    staff_id: DataTypes.INTEGER,
    module_id: DataTypes.INTEGER,
    permissions: DataTypes.JSON,
    group_id: DataTypes.INTEGER
  }, {});
  org_staff_permission.associate = function (models) {
    org_staff_permission.belongsTo(models.org_staff_group, {
      foreignKey: 'group_id',
      as: 'group'
    })
  };
  return org_staff_permission;
};
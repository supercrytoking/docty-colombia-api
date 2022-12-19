'use strict';
module.exports = (sequelize, DataTypes) => {
  const org_staff_group = sequelize.define('org_staff_group', {
    user_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    permissions: DataTypes.JSON
  }, {});
  org_staff_group.associate = function (models) {
    // associations can be defined here
  };
  return org_staff_group;
};
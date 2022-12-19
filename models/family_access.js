'use strict';
module.exports = (sequelize, DataTypes) => {
  const family_access = sequelize.define('family_access', {
    user_id: DataTypes.INTEGER,
    permitted_to: DataTypes.INTEGER,
    permissions: DataTypes.JSON
  }, {});
  family_access.associate = function (models) {
    // associations can be defined here
  };
  return family_access;
};
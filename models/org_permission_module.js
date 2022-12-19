'use strict';
module.exports = (sequelize, DataTypes) => {
  const org_permission_module = sequelize.define('org_permission_module', {
    name: DataTypes.STRING,
    name_es: DataTypes.STRING,
    url: DataTypes.STRING
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  org_permission_module.associate = function (models) {
    // associations can be defined here
  };
  return org_permission_module;
};
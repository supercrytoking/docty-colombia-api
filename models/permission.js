'use strict';
module.exports = (sequelize, DataTypes) => {
  const permission = sequelize.define('permission', {
    name: DataTypes.STRING,
    url: DataTypes.STRING,
    module: {
      type: DataTypes.STRING,
      defaultValue: 'monitor'
    },
    en: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    es: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {});
  permission.associate = function (models) {
    // associations can be defined here
  };
  return permission;
};
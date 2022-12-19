'use strict';
module.exports = (sequelize, DataTypes) => {
  const file_manager = sequelize.define('file_manager', {
    name: DataTypes.STRING,
    path: DataTypes.STRING
  }, {});
  file_manager.associate = function(models) {
    // associations can be defined here
  };
  return file_manager;
};
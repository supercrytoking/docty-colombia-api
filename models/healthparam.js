'use strict';
module.exports = (sequelize, DataTypes) => {
  const healthParam = sequelize.define('healthParam', {
    gender: DataTypes.STRING,
    minAge: DataTypes.INTEGER,
    maxAge: DataTypes.INTEGER,
    minReading: DataTypes.INTEGER,
    maxReading: DataTypes.INTEGER,
    label: DataTypes.STRING,
    class: DataTypes.STRING,
    conditions: DataTypes.JSON
  }, {
    tableName: 'health_params'
  });
  healthParam.associate = function (models) {
    // associations can be defined here
  };
  return healthParam;
};
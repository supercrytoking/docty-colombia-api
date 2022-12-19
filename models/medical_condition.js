'use strict';
module.exports = (sequelize, DataTypes) => {
  const medical_condition = sequelize.define('medical_condition', {
    title: DataTypes.STRING,
    deleted_at: DataTypes.DATE
  }, {});
  medical_condition.associate = function(models) {
    // associations can be defined here
  };
  return medical_condition;
};
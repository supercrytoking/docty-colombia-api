'use strict';
module.exports = (sequelize, DataTypes) => {
  const coporateDisignation = sequelize.define('coporateDisignation', {
    user_id: DataTypes.INTEGER,
    designation: DataTypes.STRING,
    risk_factors: DataTypes.JSON,
  }, {});
  coporateDisignation.associate = function (models) {
    // associations can be defined here
  };
  return coporateDisignation;
};
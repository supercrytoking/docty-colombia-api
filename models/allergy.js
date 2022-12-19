'use strict';
module.exports = (sequelize, DataTypes) => {
  const allergy = sequelize.define('allergy', {
    title: DataTypes.STRING,
    deleted_at: DataTypes.DATE
  }, {});
  allergy.associate = function(models) {
    // associations can be defined here
  };
  return allergy;
};
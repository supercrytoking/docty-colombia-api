'use strict';
module.exports = (sequelize, DataTypes) => {
  const medicine_dose_type = sequelize.define('medicine_dose_type', {
    type: DataTypes.STRING
  }, {});
  medicine_dose_type.associate = function(models) {
    // associations can be defined here
  };
  return medicine_dose_type;
};
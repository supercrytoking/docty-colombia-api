'use strict';
module.exports = (sequelize, DataTypes) => {
  const medication_duration = sequelize.define('medication_duration', {
    duration: DataTypes.STRING
  }, {});
  medication_duration.associate = function(models) {
    // associations can be defined here
  };
  return medication_duration;
};
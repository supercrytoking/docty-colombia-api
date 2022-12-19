'use strict';
module.exports = (sequelize, DataTypes) => {
  const medication_slot = sequelize.define('medication_slot', {
    slot: DataTypes.STRING,
    hours: DataTypes.INTEGER
  }, {});
  medication_slot.associate = function(models) {
    // associations can be defined here
  };
  return medication_slot;
};
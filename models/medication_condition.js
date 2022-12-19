'use strict';
module.exports = (sequelize, DataTypes) => {
  const medication_condition = sequelize.define('medication_condition', {
    condition: DataTypes.STRING
  }, {});
  medication_condition.associate = function(models) {
    // associations can be defined here
  };
  return medication_condition;
};
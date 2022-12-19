'use strict';
module.exports = (sequelize, DataTypes) => {
  const medication_type = sequelize.define('medication_type', {
    type: DataTypes.STRING
  }, {});
  medication_type.associate = function(models) {
    // associations can be defined here
  };
  return medication_type;
};
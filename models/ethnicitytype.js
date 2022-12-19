'use strict';
module.exports = (sequelize, DataTypes) => {
  const ethnicityType = sequelize.define('ethnicityType', {
    name: DataTypes.STRING
  }, {});
  ethnicityType.associate = function(models) {
    // associations can be defined here
  };
  return ethnicityType;
};
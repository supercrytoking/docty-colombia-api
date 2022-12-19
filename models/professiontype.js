'use strict';
module.exports = (sequelize, DataTypes) => {
  const professionType = sequelize.define('professionType', {
    name: DataTypes.STRING
  }, {});
  professionType.associate = function(models) {
    // associations can be defined here
  };
  return professionType;
};
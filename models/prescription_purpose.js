'use strict';
module.exports = (sequelize, DataTypes) => {
  const prescription_Purpose = sequelize.define('prescription_Purpose', {
    name: DataTypes.STRING,
    en: DataTypes.STRING,
    es: DataTypes.STRING
  }, {});
  prescription_Purpose.associate = function(models) {
    // associations can be defined here
  };
  return prescription_Purpose;
};
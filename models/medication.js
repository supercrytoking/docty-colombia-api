'use strict';
module.exports = (sequelize, DataTypes) => {
  const medication = sequelize.define('medication', {
    prescriptionID: DataTypes.INTEGER,
    medicationType: DataTypes.STRING,
    medicineName: DataTypes.STRING,
    therapy: DataTypes.STRING,
    doses: DataTypes.JSON,
    slot: DataTypes.STRING,
    timing: DataTypes.JSON,
    medicalDuration: DataTypes.STRING,
    doctorComment: DataTypes.STRING
  }, {});
  medication.associate = function(models) {
    // associations can be defined here
  };
  return medication;
};
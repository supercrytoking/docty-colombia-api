'use strict';
module.exports = (sequelize, DataTypes) => {
  const medical_request = sequelize.define('medical_request', {
    patient_id: DataTypes.INTEGER,
    clinic_id: DataTypes.INTEGER,
    corporate_id: DataTypes.INTEGER,
    medical_type: DataTypes.STRING,
    certificate_type: DataTypes.STRING,
    last_date: DataTypes.DATE,
    remark: DataTypes.TEXT,
    priority: DataTypes.STRING,
    meta: DataTypes.JSON,
    status: DataTypes.BOOLEAN
  }, {});
  medical_request.associate = function (models) {
    // associations can be defined here
  };
  return medical_request;
};
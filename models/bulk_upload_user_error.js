'use strict';
module.exports = (sequelize, DataTypes) => {
  const bulk_upload_user_error = sequelize.define('bulk_upload_user_error', {
    clinic_id: DataTypes.INTEGER,
    patient_id: DataTypes.INTEGER,
    errors: DataTypes.JSON
  }, {
    // tableName:'user_inactives'
  });
  bulk_upload_user_error.associate = function (models) {
    // associations can be defined here
  };
  return bulk_upload_user_error;
};
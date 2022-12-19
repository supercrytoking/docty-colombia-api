'use strict';
module.exports = (sequelize, DataTypes) => {
  const clinic_jotform = sequelize.define('clinic_jotform', {
    clinic_id: DataTypes.INTEGER,
    form_id: DataTypes.STRING,
    isActive: DataTypes.BOOLEAN
  }, {});
  clinic_jotform.associate = function (models) {
    // associations can be defined here
  };
  return clinic_jotform;
};
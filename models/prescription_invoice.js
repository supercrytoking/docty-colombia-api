'use strict';
module.exports = (sequelize, DataTypes) => {
  const prescription_invoice = sequelize.define('prescription_invoice', {
    prescription_id: DataTypes.INTEGER,
    medications: DataTypes.JSON,
    status_remark: DataTypes.JSON,
    extras: DataTypes.JSON,
    user_id: DataTypes.INTEGER,
    status: DataTypes.INTEGER,
    total: DataTypes.DECIMAL(16, 2),
  }, {});
  prescription_invoice.associate = function (models) {

  };
  return prescription_invoice;
};
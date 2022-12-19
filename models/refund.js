'use strict';
module.exports = (sequelize, DataTypes) => {
  const refund = sequelize.define('refund', {
    booking_id: DataTypes.INTEGER,
    proofDoc: DataTypes.STRING,
    notes: DataTypes.STRING,
    refundBY: DataTypes.INTEGER,
    refundByAdmin: DataTypes.INTEGER,
    extras: DataTypes.JSON
  }, {});
  refund.associate = function(models) {
    // associations can be defined here
  };
  return refund;
};
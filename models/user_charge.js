'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_charge = sequelize.define('user_charge', {
    user_id: DataTypes.INTEGER,
    service: DataTypes.STRING,
    charge_type: DataTypes.STRING,
    fees: DataTypes.FLOAT,
    recurring_fee: DataTypes.FLOAT,
    title: DataTypes.STRING,
    details: DataTypes.TEXT,
    currency: DataTypes.TEXT,
    valid_till: DataTypes.DATE
  }, {});
  user_charge.associate = function(models) {
    // associations can be defined here
  };
  return user_charge;
};
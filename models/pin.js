'use strict';
module.exports = (sequelize, DataTypes) => {
  const pin = sequelize.define('pin', {
    user_id: DataTypes.INTEGER,
    pin: DataTypes.INTEGER,
    status: DataTypes.INTEGER,
    member_id: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {});
  pin.associate = function (models) {
    // associations can be defined here
  };
  return pin;
};    
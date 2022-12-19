'use strict';
module.exports = (sequelize, DataTypes) => {
  const pins_phone = sequelize.define('pins_phone', {
    phone_number: DataTypes.STRING,
    pin: DataTypes.INTEGER,
    status: DataTypes.INTEGER
  }, {});
  pins_phone.associate = function(models) {
    // associations can be defined here
  };
  return pins_phone;
};
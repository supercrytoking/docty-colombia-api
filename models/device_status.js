'use strict';
module.exports = (sequelize, DataTypes) => {
  const device_status = sequelize.define('device_status', {
    user_id: DataTypes.INTEGER,
    device_type: DataTypes.STRING,
    dvice_id: DataTypes.STRING,
    mac_address: DataTypes.STRING,
    device_status: DataTypes.JSON
  }, {});
  device_status.associate = function(models) {
    // associations can be defined here
  };
  return device_status;
};
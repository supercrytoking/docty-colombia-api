'use strict';
module.exports = (sequelize, DataTypes) => {
  const monitor_notifications_log = sequelize.define('monitor_notifications_log', {
    trigger_name: DataTypes.STRING,
    data: DataTypes.JSON,
    error: DataTypes.STRING,
    seen: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {});
  monitor_notifications_log.associate = function (models) {
  

  };
  return monitor_notifications_log;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const email_trigger_monitor_notification = sequelize.define('email_trigger_monitor_notification', {
    trigger_id: DataTypes.INTEGER,

    title: DataTypes.TEXT,
    title_es: DataTypes.TEXT,
    warning_level: { type: DataTypes.STRING, defaultValue: 'info' },
  }, {});
  email_trigger_monitor_notification.associate = function (models) {
    // associations can be defined here
    
  };
  return email_trigger_monitor_notification;
};
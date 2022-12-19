'use strict';
module.exports = (sequelize, DataTypes) => {
  const email_trigger_notification = sequelize.define('email_trigger_notification', {
    trigger_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    body: DataTypes.TEXT,
    
    title_es: DataTypes.STRING,
    body_es: DataTypes.TEXT,
    
    payload_android: DataTypes.TEXT,
    payload_ios: DataTypes.TEXT
  }, {});
  email_trigger_notification.associate = function (models) {
    // associations can be defined here
    
  };
  return email_trigger_notification;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const notification_subscription = sequelize.define('notification_subscription', {
    user_id: DataTypes.INTEGER,
    admin_id: DataTypes.INTEGER,
    subscription: DataTypes.JSON,
    platform: DataTypes.STRING
  }, {
    timestamps: true,
  });
  notification_subscription.associate = function (models) {

  };
  return notification_subscription;
};
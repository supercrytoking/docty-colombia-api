'use strict';
module.exports = (sequelize, DataTypes) => {
  const call_notification = sequelize.define('call_notification', {
    call_id:DataTypes.STRING,
    caller_id: DataTypes.INTEGER,
    receiver_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    status: DataTypes.INTEGER,
    channel: DataTypes.STRING,
  }, {
    timestamps: true,
  });
  call_notification.associate = function(models) {
    // call.belongsTo(models.user, {
    //   foreignKey: 'user_id',
    //   targetKey:'receiver_id',
    //   as: 'received_to'
    // });
    call_notification.belongsTo(models.user, {
      foreignKey: 'caller_id',
      // targetKey:'caller_id',
      as: 'call_by'
    });
  };
  return call_notification;
};
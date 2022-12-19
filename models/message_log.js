'use strict';
module.exports = (sequelize, DataTypes) => {
  const message_log = sequelize.define('message_log', {
    sender: DataTypes.INTEGER,
    sender_admin: DataTypes.INTEGER,

    receiver: DataTypes.INTEGER,
    receiver_admin: DataTypes.INTEGER,

    message: DataTypes.TEXT,
    isFileUrl: DataTypes.BOOLEAN,
    seen: DataTypes.BOOLEAN,
    is_notified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reference: DataTypes.INTEGER,
    booking_id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.reference
      }
    },
  }, {
    defaultScope: {
      attributes: { exclude: ['updatedAt'] }
    }
  });
  message_log.associate = function (models) {
    message_log.belongsTo(models.user.scope('minimalInfo'), {
      foreignKey: 'sender',
      as: 'sender_info'
    });
    message_log.belongsTo(models.admin, {
      foreignKey: 'sender_admin',
      as: 'sender_admin_info'
    });
    message_log.belongsTo(models.user.scope('minimalInfo'), {
      foreignKey: 'receiver',
      as: 'receiver_info'
    });
    message_log.belongsTo(models.admin, {
      foreignKey: 'receiver_admin',
      as: 'receiver_admin_info'
    });
    message_log.belongsTo(models.message_reference, {
      foreignKey: 'reference',
      as: 'reference_info'
    });

  };
  return message_log;
};
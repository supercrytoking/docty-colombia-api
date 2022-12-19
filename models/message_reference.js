'use strict';
module.exports = (sequelize, DataTypes) => {
  const message_reference = sequelize.define('message_reference', {
    type: DataTypes.STRING, // 'reviewer', 'booking'
    booking_id: DataTypes.INTEGER
  }, {
    defaultScope: {
      attributes: { exclude: ['updatedAt'] }
    }
  });
  message_reference.associate = function (models) {
    message_reference.belongsTo(models.booking, {
      foreignKey: 'booking_id',
      as: 'booking'
    });

  };
  return message_reference;
};
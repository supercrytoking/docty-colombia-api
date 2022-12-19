'use strict';

module.exports = (sequelize, DataTypes) => {
  const coupon_history = sequelize.define('coupon_history', {
    user_id: DataTypes.INTEGER,
    coupon_id: DataTypes.INTEGER,
    booking_id: DataTypes.INTEGER,
    company_service_id: DataTypes.INTEGER,// ? yet, not use
    service: DataTypes.STRING,
    charge: DataTypes.INTEGER,
  }, {
    defaultScope: {
      attributes: { exclude: ['updatedAt'] }
    }
  });
  coupon_history.associate = function (models) {
    // associations can be defined here
    coupon_history.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user',
    });
    coupon_history.belongsTo(models.booking, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
  };
  return coupon_history;
};
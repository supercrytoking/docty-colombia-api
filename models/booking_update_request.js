'use strict';

const status = {
  waiting: 0, accepted: 1, cancelled: 2, rejected: 3, error: 4, new_booking_by_support: 5,
  "0": "waiting", "1": "accepted", "2": "cancelled", "3": "rejected", "5": "new_booking_by_support"
}

module.exports = (sequelize, DataTypes) => {
  const booking_update_request = sequelize.define('booking_update_request', {
    booking_id: DataTypes.INTEGER,
    reason: DataTypes.STRING,
    status: DataTypes.INTEGER,
    old_provider_id: DataTypes.INTEGER,
    new_provider_id: DataTypes.INTEGER,
    by_admin: DataTypes.INTEGER,
    by_user: DataTypes.INTEGER, // clinic
  }, {
    getterMethods: {
      status: function () {
        let v = this.getDataValue('status');
        return (status[v] || null)
      }
    },
    setterMethods: {
      status: function (value) {
        let v = (value || '').toLowerCase();
        this.setDataValue('status', (status[v] || 0));
      }
    }
  });
  booking_update_request.associate = function (models) {
    booking_update_request.belongsTo(models.booking, {
      foreignKey: 'booking_id',
      as: 'booking'
    });
    booking_update_request.hasMany(models.booking_update_schedule, {
      foreignKey: 'request_id',
      as: 'slots'
    });
    booking_update_request.belongsTo(models.admin, {
      foreignKey: 'by_admin',
      as: 'admin'
    });
    booking_update_request.belongsTo(models.user, {
      foreignKey: 'by_user',
      as: 'user'
    });
  };
  return booking_update_request;
};
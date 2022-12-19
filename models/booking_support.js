'use strict';

const status = {
  waiting: 0, accepted: 5, rejected: 2, running: 1, complete: 3, error: 4, slotBusy: 6, rescheduling: 7, canceled: 8, consulted: 9,
  "0": "waiting", "1": "running", "2": "rejected", "3": "complete", "4": "error", "5": "accepted", "6": "slotBusy", "7": "rescheduling", "8": "canceled", 9: "consulted"
}
module.exports = (sequelize, DataTypes) => {
  const booking_support = sequelize.define('booking_support', {
    booking_id: DataTypes.INTEGER,
    provider_id: DataTypes.INTEGER,
    amount: DataTypes.DECIMAL(12, 2),
    status: {
      type: DataTypes.INTEGER, defaultValue: 0,
      get() {
        let v = this.getDataValue('status');
        return (status[v] || null)
      },
      set(value) {
        console.log(value, 'status')
        let v = (value || 'waiting').toLowerCase();
        this.setDataValue('status', (status[v] || 0));
      }
    },
  }, {
    defaultScope: {
      include: 'support_with'
    },
  });
  booking_support.associate = function (models) {
    booking_support.belongsTo(models.booking, {
      foreignKey: 'booking_id',
      as: 'booking'
    });
    booking_support.belongsTo(models.user.scope('publicInfo', 'timezone'), {
      foreignKey: 'provider_id',
      as: 'support_with',
    });
  };
  return booking_support;
};
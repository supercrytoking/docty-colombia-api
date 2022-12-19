'use strict';

module.exports = (sequelize, DataTypes) => {
  const booking_update_schedule = sequelize.define('booking_update_schedule', {
    request_id: DataTypes.INTEGER,
    booking_id: DataTypes.INTEGER,
    schedule_id: DataTypes.INTEGER
  }, {

  });
  booking_update_schedule.associate = function (models) {
    booking_update_schedule.belongsTo(models.schedule, {
      foreignKey: 'schedule_id',
      as: 'schedule'
    });
  };
  return booking_update_schedule;
};
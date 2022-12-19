'use strict';
module.exports = (sequelize, DataTypes) => {
  const schedule = sequelize.define('schedule', {
    user_id: DataTypes.INTEGER,
    calendarId: DataTypes.INTEGER,
    title: {
      type: DataTypes.STRING,
      set(value) {
        let v1 = value;
        if (value == 'Available') {
          v1 = 'Disponible/Available'
        }
        if (value == 'Available Slot') {
          v1 = 'Espacio disponible/Available Slots'
        }
        this.setDataValue('title', v1);
      }
    },
    location: DataTypes.STRING,
    category: DataTypes.STRING,
    start: DataTypes.DATE,
    end: DataTypes.DATE,
    dueDateClass: DataTypes.STRING,
    isReadOnly: DataTypes.BOOLEAN,
    state: DataTypes.STRING,
    isAllDay: DataTypes.BOOLEAN,
    reference_id: DataTypes.STRING,
    councelling_type: DataTypes.STRING,
  }, {
    scopes: {
      essentialsOnly: {
        attributes: ['calendarId', 'id', 'start', 'end', 'user_id']
      }
    }
  });
  schedule.associate = function (models) {
    // associations can be defined here
  };
  return schedule;
};
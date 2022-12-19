'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_event = sequelize.define('user_event', {
    user_id: DataTypes.INTEGER,
    calendarId: DataTypes.INTEGER,
    title: DataTypes.STRING,
    location: DataTypes.STRING,
    category: DataTypes.STRING,
    start: DataTypes.DATE,
    end: DataTypes.DATE,
    dueDateClass: DataTypes.STRING,
    isReadOnly: DataTypes.BOOLEAN,
    state: DataTypes.STRING,
    booking_id: DataTypes.INTEGER,
    data: DataTypes.JSON,
  }, {
    scopes: {
    }
  });
  user_event.associate = function (models) {
    // associations can be defined here
    user_event.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };
  return user_event;
};
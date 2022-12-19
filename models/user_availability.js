'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_availability = sequelize.define('user_availability', {
    user_id: DataTypes.INTEGER,
    location_id: DataTypes.INTEGER,
    open_days: DataTypes.STRING,
    opening_time: DataTypes.TIME,
    closing_time: DataTypes.TIME
  }, {});
  user_availability.associate = function(models) {
    // associations can be defined here
  };
  return user_availability;
};
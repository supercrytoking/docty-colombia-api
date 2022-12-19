'use strict';
module.exports = (sequelize, DataTypes) => {
  const location_open = sequelize.define('location_open', {
    location_id: DataTypes.INTEGER,
    open_days: DataTypes.STRING,
    is_open: DataTypes.BOOLEAN,
    is_full_time: DataTypes.BOOLEAN,
    user_id: DataTypes.INTEGER
  }, {
    defaultScope:{
      include:['times'],
      attributes:{exclude:['createdAt','updatedAt']}
    }
  });
  location_open.associate = function (models) {
    location_open.hasMany(models.location_open_time, {
      foreignKey: 'location_open_id',
      as: 'times'
    })
  };
  return location_open;
};
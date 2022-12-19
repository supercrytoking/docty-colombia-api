'use strict';
module.exports = (sequelize, DataTypes) => {
  const location_open_time = sequelize.define('location_open_time', {
    location_id: DataTypes.INTEGER,
    location_open_id: DataTypes.INTEGER,
    open_hour: DataTypes.INTEGER,
    open_minuts: DataTypes.INTEGER,
    closing_hour: DataTypes.INTEGER,
    closing_minuts: DataTypes.INTEGER,
  }, {
    defaultScope:{
      attributes:{exclude:['createdAt','updatedAt']}
    }
  });
  location_open_time.associate = function (models) {
    location_open_time.belongsTo(models.location, {
      foreignKey: 'location_id',
      as: 'located_at'
    })
  };
  return location_open_time;
};
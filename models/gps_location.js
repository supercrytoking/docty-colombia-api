'use strict';
module.exports = (sequelize, DataTypes) => {
  const gps_location = sequelize.define('gps_location', {
    user_id: DataTypes.INTEGER,
    track_id: DataTypes.INTEGER,
    lat: DataTypes.FLOAT,
    lng: DataTypes.FLOAT,
  }, {});

  gps_location.associate = function (models) {
    gps_location.belongsTo(models.gps_track, {
      foreignKey: 'track_id',
      as: 'track',
    });
  };
  return gps_location;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const gps_track = sequelize.define('gps_track', {
    from_id: DataTypes.INTEGER,
    to_id: DataTypes.INTEGER
  }, {});
  gps_track.associate = function (models) {
    gps_track.belongsTo(models.user, {
      foreignKey: 'from_id',
      as: 'from_user',
    });
    gps_track.belongsTo(models.user, {
      foreignKey: 'to_id',
      as: 'to_user',
    });

  };
  return gps_track;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const councelling = sequelize.define('councelling', {
    patient_id: DataTypes.INTEGER,
    provider_id: DataTypes.INTEGER,
    channel: DataTypes.STRING,
    emotions: DataTypes.JSON
  }, {});
  councelling.associate = function(models) {
    // associations can be defined here
  };
  return councelling;
};
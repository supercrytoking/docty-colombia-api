'use strict';
module.exports = (sequelize, DataTypes) => {
  const slot = sequelize.define('slot', {
    counselling_type: DataTypes.INTEGER,
    duration: DataTypes.INTEGER,
    status: DataTypes.STRING,
    deleted_at: DataTypes.DATE
  }, {});
  slot.associate = function(models) {
    // associations can be defined here
  };
  return slot;
};
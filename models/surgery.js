'use strict';
module.exports = (sequelize, DataTypes) => {
  const surgery = sequelize.define('surgery', {
    title: DataTypes.STRING,
    deleted_at: DataTypes.DATE
  }, {});
  surgery.associate = function(models) {
    // associations can be defined here
  };
  return surgery;
};
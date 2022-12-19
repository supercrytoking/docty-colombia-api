'use strict';
module.exports = (sequelize, DataTypes) => {
  const educationType = sequelize.define('educationType', {
    name: DataTypes.STRING
  }, {});
  educationType.associate = function(models) {
    // associations can be defined here
  };
  return educationType;
};
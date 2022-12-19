'use strict';
module.exports = (sequelize, DataTypes) => {
  const educationCategory = sequelize.define('educationCategory', {
    name: DataTypes.STRING
  }, {});
  educationCategory.associate = function(models) {
    // associations can be defined here
  };
  return educationCategory;
};
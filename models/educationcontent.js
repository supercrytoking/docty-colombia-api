'use strict';
module.exports = (sequelize, DataTypes) => {
  const educationContent = sequelize.define('educationContent', {
    categoryID: DataTypes.INTEGER,
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    files: DataTypes.JSON
  }, {});
  educationContent.associate = function(models) {
    // associations can be defined here
  };
  return educationContent;
};
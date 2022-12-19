'use strict';
module.exports = (sequelize, DataTypes) => {
  const dropdown = sequelize.define('dropdown', {
    keyword: DataTypes.STRING,
    type: DataTypes.STRING,
    language: DataTypes.STRING,
    identity: DataTypes.STRING,
  }, {});
  dropdown.associate = function (models) {
    // associations can be defined here
  };
  return dropdown;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const storedQuery = sequelize.define('storedQuery', {
    user_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    queries: DataTypes.JSON
  }, {});
  storedQuery.associate = function (models) {
    // associations can be defined here
  };
  return storedQuery;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const apiKey = sequelize.define('apiKey', {
    user_id: DataTypes.INTEGER,
    apiKey: DataTypes.STRING
  }, {});
  apiKey.associate = function(models) {
    // associations can be defined here
  };
  return apiKey;
};
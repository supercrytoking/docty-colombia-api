'use strict';
module.exports = (sequelize, DataTypes) => {
  const userLastLogin = sequelize.define('userLastLogin', {
    lastLogin: DataTypes.DATE,
    platform: DataTypes.STRING,
    user_id: DataTypes.INTEGER
  }, {});
  userLastLogin.associate = function(models) {
    // associations can be defined here
  };
  return userLastLogin;
};
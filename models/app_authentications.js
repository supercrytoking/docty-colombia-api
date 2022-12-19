'use strict';
module.exports = (sequelize, DataTypes) => {
  const app_authentication = sequelize.define('app_authentication', {
    username: DataTypes.STRING,
    otp: DataTypes.INTEGER,
    expiry: DataTypes.DATE,
    status: DataTypes.BOOLEAN
  }, {});
  app_authentication.associate = function (models) {
    // associations can be defined here
  };
  return app_authentication;
};
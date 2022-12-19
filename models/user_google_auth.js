'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_google_auth = sequelize.define('user_google_auth', {
    user_id: DataTypes.INTEGER,
    refresh_token: DataTypes.STRING
  }, {});
  user_google_auth.associate = function (models) {
    // associations can be defined here
  };
  return user_google_auth;
};
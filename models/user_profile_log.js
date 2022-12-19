'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_profile_log = sequelize.define('user_profile_log', {
    user_id: DataTypes.INTEGER,
    detail: DataTypes.JSON,
  }, {

  });
  user_profile_log.associate = function (models) {
    // associations can be defined here
  };
  return user_profile_log;
};
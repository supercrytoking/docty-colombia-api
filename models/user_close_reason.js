'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_close_reason = sequelize.define('user_close_reason', {
    user_id: DataTypes.INTEGER,
    reason: DataTypes.TEXT,
  }, {});
  user_close_reason.associate = function(models) {
    // associations can be defined here
  };
  return user_close_reason;
};
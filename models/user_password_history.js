'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_password_history = sequelize.define('user_password_history', {
    user_id: DataTypes.INTEGER,
    member_id: { type: DataTypes.INTEGER, defaultValue: 0 },
    password: { type: DataTypes.STRING, trim: true },
  }, {
  });
  user_password_history.associate = function (models) {

  };
  return user_password_history;
};
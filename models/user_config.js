'use strict';

const db = require("./index");

module.exports = (sequelize, DataTypes) => {
  const user_config = sequelize.define('user_config', {
    user_id: DataTypes.INTEGER,
    is_no_insurance: { type: DataTypes.BOOLEAN, default: false },
    is_no_bank: { type: DataTypes.BOOLEAN, default: false },
    member_id: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
  });

  user_config.associate = function (models) {

  };
  return user_config;
};
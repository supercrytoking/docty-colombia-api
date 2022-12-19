'use strict';
module.exports = (sequelize, DataTypes) => {
  const sms_shortcodes = sequelize.define('sms_shortcodes', {
    name: DataTypes.STRING,
    description: DataTypes.STRING
  }, {});
  sms_shortcodes.associate = function(models) {
    // associations can be defined here
  };
  return sms_shortcodes;
};
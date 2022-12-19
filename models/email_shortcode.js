'use strict';
module.exports = (sequelize, DataTypes) => {
  const emailShortcode = sequelize.define('email_shortcode', {
    name: DataTypes.STRING,
    description: DataTypes.STRING
  }, {});
  emailShortcode.associate = function(models) {
    // associations can be defined here
  };
  return emailShortcode;
};
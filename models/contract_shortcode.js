'use strict';
module.exports = (sequelize, DataTypes) => {
  const contractShortcode = sequelize.define('contract_shortcode', {
    name: DataTypes.STRING,
    description: DataTypes.STRING
  }, {});
  contractShortcode.associate = function(models) {
    // associations can be defined here
  };
  return contractShortcode;
};
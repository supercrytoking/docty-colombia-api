'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_tnc_version = sequelize.define('user_tnc_version', {
    user_id: DataTypes.INTEGER,
    version: DataTypes.INTEGER
  }, {});
  user_tnc_version.associate = function(models) {
    // associations can be defined here
  };
  return user_tnc_version;
};
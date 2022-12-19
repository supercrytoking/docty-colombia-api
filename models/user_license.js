'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_license = sequelize.define('user_license', {
    user_id: DataTypes.INTEGER,
    licence_type: DataTypes.STRING,
    licence_orgnization: DataTypes.STRING,
    licence_orgnization_id: DataTypes.STRING,
    details: DataTypes.TEXT,
    licence_id: DataTypes.STRING,
    valid_till: DataTypes.DATE,
    title: DataTypes.STRING,
    document: DataTypes.TEXT
  }, {});
  user_license.associate = function (models) {
    // associations can be defined here
  };
  return user_license;
};
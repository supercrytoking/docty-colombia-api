'use strict';
module.exports = (sequelize, DataTypes) => {
  const consultation_type = sequelize.define('consultation_type', {
    name: DataTypes.STRING,
    type_code: DataTypes.STRING,
  }, {});
  consultation_type.associate = function (models) {
    // associations can be defined here
  };
  return consultation_type;
};
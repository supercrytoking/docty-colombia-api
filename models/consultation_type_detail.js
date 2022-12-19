'use strict';
module.exports = (sequelize, DataTypes) => {
  const consultation_type = sequelize.define('consultation_type_detail', {
    consultation_type_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    type_code: DataTypes.STRING,
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    price: DataTypes.DECIMAL(10, 2),
    language: DataTypes.STRING(5),
    unit: {
      type: DataTypes.STRING(5)
    },
  }, {});
  consultation_type.associate = function (models) {
    // associations can be defined here
  };
  return consultation_type;
};
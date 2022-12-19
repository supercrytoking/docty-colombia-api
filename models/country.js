'use strict';
module.exports = (sequelize, DataTypes) => {
  const country = sequelize.define('country', {
    shortname: DataTypes.STRING,
    name: DataTypes.STRING,
    phonecode: DataTypes.INTEGER,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    }
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  country.associate = function (models) {
    // associations can be defined here
  };
  return country;
};
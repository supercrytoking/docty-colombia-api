'use strict';
module.exports = (sequelize, DataTypes) => {
  const credential = sequelize.define('credential', {
    key: DataTypes.STRING,
    value: DataTypes.STRING,
    options: DataTypes.JSON,
    user_id: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  credential.associate = function (models) {
    // associations can be defined here
  };
  return credential;
};
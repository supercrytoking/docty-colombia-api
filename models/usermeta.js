'use strict';
module.exports = (sequelize, DataTypes) => {
  const userMeta = sequelize.define('userMeta', {
    user_id: DataTypes.INTEGER,
    key: DataTypes.STRING,
    value: DataTypes.STRING,
    json_data: DataTypes.JSON,
  }, {
    tableName: 'usermeta'
  });
  userMeta.associate = function (models) {
    // associations can be defined here
  };
  return userMeta;
};
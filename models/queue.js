'use strict';
module.exports = (sequelize, DataTypes) => {
  const queues = sequelize.define('queue', {
    job: DataTypes.TEXT,
    status: DataTypes.NUMBER,
    attempt: DataTypes.NUMBER,
    type: DataTypes.STRING,
    errors: DataTypes.JSON,
    scheduletime: DataTypes.DATE
  }, {});
  queues.associate = function (models) {
    // associations can be defined here
  };
  return queues;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const activity_log_template = sequelize.define('activity_log_trigger', {
    trigger: DataTypes.STRING,
    description: DataTypes.STRING
  }, {});
  activity_log_template.associate = function (models) {
    // associations can be defined here
  };
  return activity_log_template;
};
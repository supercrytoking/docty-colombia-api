'use strict';
module.exports = (sequelize, DataTypes) => {
  const activity_log_template = sequelize.define('activity_log_template', {
    trigger_id: DataTypes.STRING,
    language: DataTypes.STRING,
    user_role: DataTypes.INTEGER,
    content: DataTypes.STRING,
    module_link: DataTypes.STRING,
  }, {});
  activity_log_template.associate = function (models) {
    // associations can be defined here
    activity_log_template.belongsTo(models.activity_log_trigger, {
      foreignKey: 'trigger_id',
      as: 'trigger'
    });
  };
  return activity_log_template;
};
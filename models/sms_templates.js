'use strict';
module.exports = (sequelize, DataTypes) => {
  const sms_templates = sequelize.define('sms_templates', {
    title: DataTypes.STRING,
    message: DataTypes.STRING,
    language: DataTypes.STRING,
    minutesbefore: DataTypes.STRING,
    user_id: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {});
  sms_templates.associate = function(models) {
    // associations can be defined here
    sms_templates.belongsToMany(models.sms_triggers, {
      foreignKey: 'template_id',
      otherKey: 'trigger_id',
      through: models.sms_automations,
      as: 'trigger'
    })
  };
  return sms_templates;
};
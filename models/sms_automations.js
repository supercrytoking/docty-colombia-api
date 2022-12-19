'use strict';
module.exports = (sequelize, DataTypes) => {
  const sms_automations = sequelize.define('sms_automations', {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    trigger_id: DataTypes.INTEGER,
    template_id: { type: DataTypes.STRING, trim: true },
    language: { type: DataTypes.STRING, trim: true },
    user_id: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {});
  sms_automations.associate = function(models) {
    // associations can be defined here
    sms_automations.belongsTo(models.sms_triggers, {
      foreignKey: 'trigger_id',
      as: 'trigger'
    });
    sms_automations.belongsTo(models.sms_templates, {
      foreignKey: 'template_id',
      as: 'template',
    });
  };
  return sms_automations;
};
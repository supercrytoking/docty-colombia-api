'use strict';
module.exports = (sequelize, DataTypes) => {
  const sms_triggers = sequelize.define('sms_triggers', {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    is_personalization: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {});
  sms_triggers.associate = function (models) {
    // associations can be defined here
    sms_triggers.hasMany(models.sms_automations, {
      foreignKey: 'trigger_id',
      as: 'automation'
    });
    sms_triggers.belongsToMany(models.sms_templates, {
      foreignKey: 'trigger_id',
      otherKey: 'template_id',
      through: models.sms_automations,
      as: 'template'
    })
  };
  return sms_triggers;
};
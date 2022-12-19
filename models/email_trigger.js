'use strict';
module.exports = (sequelize, DataTypes) => {
  const emailTrigger = sequelize.define('email_trigger', {
    name: { type: DataTypes.STRING, trim: true },
    identification: { type: DataTypes.STRING, trim: true },
    description: { type: DataTypes.STRING, trim: true },
    shortcodes: { type: DataTypes.JSON },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_personalization: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, {});
  emailTrigger.associate = function (models) {
    // associations can be defined here
    emailTrigger.hasMany(models.email_automation, {
      foreignKey: 'trigger_id',
      as: 'automation'
    });
    emailTrigger.hasOne(models.email_trigger_notification, {
      foreignKey: 'trigger_id',
      as: 'notification'
    });
    emailTrigger.hasOne(models.email_trigger_monitor_notification, {
      foreignKey: 'trigger_id',
      as: 'monitor_notification'
    });
    emailTrigger.belongsToMany(models.email_template, {
      foreignKey: 'trigger_id',
      otherKey: 'template_id',
      through: models.email_automation,
      as: 'template'
    })
  };
  return emailTrigger;
};
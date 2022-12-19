'use strict';
module.exports = (sequelize, DataTypes) => {
  const emailAutomation = sequelize.define('email_automation', {
    name: { type: DataTypes.STRING, trim: true },
    identification: { type: DataTypes.STRING, trim: true },
    type: { type: DataTypes.STRING, trim: true },
    trigger_id: DataTypes.INTEGER,
    template_id: { type: DataTypes.STRING, trim: true },
    description: { type: DataTypes.STRING, trim: true },
    status: DataTypes.BOOLEAN,
    language: { type: DataTypes.STRING, trim: true },
    user_id: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {});
  emailAutomation.associate = function (models) {
    // associations can be defined here
    emailAutomation.belongsTo(models.email_trigger, {
      foreignKey: 'trigger_id',
      as: 'trigger'
    });
    emailAutomation.belongsTo(models.email_template, {
      foreignKey: 'template_id',
      // foreignKey: 'id',
      as: 'template',
    });

  };
  return emailAutomation;
};
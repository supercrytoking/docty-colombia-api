'use strict';
module.exports = (sequelize, DataTypes) => {
  const emailTemplate = sequelize.define('email_template', {
    title: { type: DataTypes.STRING, trim: true },
    identification: { type: DataTypes.STRING, trim: true },
    description: DataTypes.STRING,
    subject: { type: DataTypes.STRING, trim: true },
    language: { type: DataTypes.STRING, defaultValue: 'en', trim: true },
    html: DataTypes.TEXT,
    design: DataTypes.JSON,
    deliveries: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
    user_id: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {});
  emailTemplate.associate = function (models) {
    emailTemplate.belongsToMany(models.email_trigger, {
      foreignKey: 'template_id',
      otherKey: 'trigger_id',
      through: models.email_automation,
      as: 'trigger'
    })
  };
  return emailTemplate;
};
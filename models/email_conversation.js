'use strict';
module.exports = (sequelize, DataTypes) => {
  const email_conversation = sequelize.define('email_conversation', {
    from: { type: DataTypes.STRING, trim: true },
    to: { type: DataTypes.STRING, trim: true },
    subject: { type: DataTypes.STRING, trim: true },
    message: DataTypes.TEXT,
    headers: DataTypes.TEXT,
    status: DataTypes.TEXT,
    attachment: DataTypes.TEXT,
    reference: DataTypes.TEXT,
    identifier: DataTypes.TEXT,
    template_id: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {});
  email_conversation.associate = function (models) {
    //
    email_conversation.belongsTo(models.email_template, {
      foreignKey: 'template_id',
      as: 'template'
    });
  };
  return email_conversation;
};
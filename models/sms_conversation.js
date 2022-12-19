'use strict';
module.exports = (sequelize, DataTypes) => {
  const sms_conversation = sequelize.define('sms_conversation', {
    from: DataTypes.STRING,
    to: DataTypes.STRING,
    message: DataTypes.TEXT,
    reference: DataTypes.STRING,
    identifier: DataTypes.STRING,
    template_id: DataTypes.INTEGER
  }, {});
  sms_conversation.associate = function(models) {
    // associations can be defined here
  };
  return sms_conversation;
};
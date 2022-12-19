'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_mood = sequelize.define('user_mood', {
    call_id: DataTypes.STRING,
    behaviours: DataTypes.JSON,
    mood: DataTypes.JSON
  }, {});
  user_mood.associate = function(models) {
    // associations can be defined here
  };
  return user_mood;
}
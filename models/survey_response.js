'use strict';
module.exports = (sequelize, DataTypes) => {
  const survey_response = sequelize.define('survey_response', {
    survey_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    response: DataTypes.TEXT
  }, {});
  survey_response.associate = function(models) {
    // associations can be defined here
  };
  return survey_response;
};
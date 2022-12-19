'use strict';

const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  const survey = sequelize.define('survey', {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    questions: DataTypes.TEXT,
    url: DataTypes.STRING,
    btn_label: DataTypes.STRING
  }, {});
  survey.associate = function(models) {
    survey.hasOne(models.survey_response, {
        foreignKey: {
          name: 'survey_id',
          fieldName: 'survey_id'
        }
      });
  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(survey);

  return survey;
};
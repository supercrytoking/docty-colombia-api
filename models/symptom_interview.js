'use strict';
module.exports = (sequelize, DataTypes) => {
  const symptom_interview = sequelize.define('patient_symptom_interview', {
    user_id: DataTypes.INTEGER,
    analysis_id: DataTypes.INTEGER,
    present: DataTypes.JSON,
    absent: DataTypes.JSON,
    unknown: DataTypes.JSON,
    symptoms: DataTypes.JSON
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  symptom_interview.associate = function(models) {
    // associations can be defined here
  };
  return symptom_interview;
};
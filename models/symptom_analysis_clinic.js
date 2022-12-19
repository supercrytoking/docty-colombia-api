'use strict';

module.exports = (sequelize, DataTypes) => {
  const symptom_analysis_clinic = sequelize.define('symptom_analysis_clinic', {
    analysis_id: DataTypes.INTEGER,
    clinic_id: DataTypes.INTEGER,
  }, {
    // freezeTableName: true,
    defaultScope: {
      // attributes: { exclude: ['updatedAt'] }
    }
  });
  symptom_analysis_clinic.associate = function (models) {
    // associations can be defined here
    symptom_analysis_clinic.belongsTo(models.user, {
      foreignKey: 'clinic_id',
      as: 'clinic'
    });
    // symptom_analysis_clinic.belongsTo(models.symptom_analysis, {
    //   foreignKey: 'analysis_id',
    //   as: 'symptom_analysis'
    // });
  };

  return symptom_analysis_clinic;
};
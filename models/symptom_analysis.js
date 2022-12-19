'use strict';

const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  const symptom_analysis = sequelize.define('symptom_analysis', {
    user_id: DataTypes.INTEGER,
    // family_id: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: 0
    // },
    age: DataTypes.INTEGER,
    sex: DataTypes.STRING,
    evidence: DataTypes.JSON,
    conditions: DataTypes.JSON,
    tirage: DataTypes.JSON,
    lab_recomended: DataTypes.JSON,
    symptom_status: DataTypes.JSON,
    changed_admin_id: DataTypes.INTEGER,
    added_by: DataTypes.INTEGER,
    changed_user_id: DataTypes.INTEGER,
    speciality_id: DataTypes.INTEGER
  }, {
    freezeTableName: true,
    defaultScope: {
      // attributes: { exclude: ['updatedAt'] }
      include: ['speciality']
    }
  });
  symptom_analysis.associate = function (models) {
    // associations can be defined here
    symptom_analysis.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'userInfo'
    });
    symptom_analysis.belongsTo(models.userFamilyView.scope('publicInfo', 'contactInfo'), {
      foreignKey: 'user_id',
      as: 'user'
    });
    symptom_analysis.belongsTo(models.user.scope('publicInfo'), {
      foreignKey: 'added_by',
      as: 'addedByUser'
    });
    symptom_analysis.belongsTo(models.admin, {
      foreignKey: 'changed_admin_id',
      as: 'changed_admin'
    });
    symptom_analysis.belongsTo(models.user, {
      foreignKey: 'changed_user_id',
      as: 'changed_user'
    });
    symptom_analysis.hasOne(models.booking, {
      foreignKey: 'dignosis_id',
      as: 'booking',
    });
    symptom_analysis.hasOne(models.symptom_analysis_clinic, {
      foreignKey: 'analysis_id',
      as: 'symptom_analysis_clinic'
    });
    symptom_analysis.hasOne(models.family_access, {
      targetKey: 'added_by',
      foreignKey: 'permitted_to',
      as: 'permitedBy',
    });
    symptom_analysis.belongsTo(models.speciality, {
      foreignKey: 'speciality_id',
      as: 'speciality'
    });
    symptom_analysis.hasOne(models.patient_symptom_interview, {
      foreignKey: 'analysis_id',
      as: 'interview'
    });

  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(symptom_analysis);

  return symptom_analysis;
};
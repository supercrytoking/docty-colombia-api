'use strict';
const department = require('../models/department');

module.exports = (sequelize, DataTypes) => {
  const user_speciality = sequelize.define('user_speciality', {
    user_id: DataTypes.INTEGER,
    speciality_id: DataTypes.INTEGER,
    department_id: DataTypes.INTEGER,
    image: { type: DataTypes.STRING, trim: true },
    overview: DataTypes.TEXT,
  }, {
    // underscored: true,
    defaultScope: {
      include: [
        'department', 'speciality'
      ]
    },
    scopes: {
      nothing: {
        attributes: { exclude: ['createdAt', 'updatedAt'] }
      }
    },
  });
  user_speciality.associate = function (models) {
    user_speciality.belongsTo(models.department, {
      foreignKey: 'department_id',
      as: 'department'
    });
    user_speciality.belongsTo(models.speciality, {
      foreignKey: 'speciality_id',
      as: 'speciality'
    });
    user_speciality.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };
  return user_speciality;
};
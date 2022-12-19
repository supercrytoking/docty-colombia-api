'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_service = sequelize.define('user_service', {
    user_id: DataTypes.INTEGER,
    department_id: DataTypes.INTEGER,
    speciality_id: DataTypes.INTEGER,
    service: { type: DataTypes.STRING, trim: true },
    price: DataTypes.FLOAT,
    description: DataTypes.TEXT,
    status: DataTypes.INTEGER,
    benefits: DataTypes.JSON,
  }, {
    underScore: true,
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  user_service.associate = function (models) {
    // associations can be defined here
    user_service.belongsTo(models.department, {
      foreignKey: 'department_id',
      as: 'department'
    });
    user_service.belongsTo(models.speciality, {
      foreignKey: 'speciality_id',
      as: 'speciality'
    });
    user_service.belongsTo(models.associate, {
      foreignKey: 'user_id',
      as: 'associatedTo',
      targetKey: 'associate',
    });
    user_service.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });

  };
  return user_service;
};
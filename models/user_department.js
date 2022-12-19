'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_department = sequelize.define('user_department', {
    department_id: DataTypes.INTEGER,
    overview: DataTypes.TEXT,
    image: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    contact_person: DataTypes.STRING
  }, {
    underScore: true,
    defaultSope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  user_department.associate = function (models) {
    user_department.belongsTo(models.department, {
      foreignKey: 'department_id',
      as: 'department'
    });
    user_department.belongsToMany(models.location, {
      foreignKey: 'user_department_id',
      otherKey: 'location_id',
      through: models.user_department_location,
      as: 'locations'
    });
    user_department.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };
  return user_department;
};
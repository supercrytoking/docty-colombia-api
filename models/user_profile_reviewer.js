'use strict';

module.exports = (sequelize, DataTypes) => {
  const user_profile_reviewer = sequelize.define('user_profile_reviewer', {
    user_id: DataTypes.INTEGER,
    admin_id: DataTypes.INTEGER,
    assigned_by: DataTypes.INTEGER,
  }, {
    defaultScope: {
      include: ['admin']
    }
  });
  user_profile_reviewer.associate = function (models) {
    // associations can be defined here
    user_profile_reviewer.belongsTo(models.admin, {
      foreignKey: 'admin_id',
      as: 'admin'
    });
    user_profile_reviewer.belongsTo(models.admin, {
      foreignKey: 'assigned_by',
      as: 'assigned'
    });
  };

  return user_profile_reviewer;
};
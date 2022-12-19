'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_role = sequelize.define('user_role', {
    user_id: DataTypes.INTEGER,
    role_id: DataTypes.INTEGER
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt', 'id'] }
    }
  });
  user_role.associate = function (models) {
    // associations can be defined here
    user_role.belongsTo(models.role, {
      foreignKey: 'role_id',
      as: 'role_info'
    });
  };
  return user_role;
};
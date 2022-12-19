'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_kindred = sequelize.define('user_kindred', {
    user_id: DataTypes.INTEGER,
    member_id: DataTypes.INTEGER,
    relation: DataTypes.STRING,
    allow_access: DataTypes.BOOLEAN,
    deletedAt: DataTypes.DATE
  }, {
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ['createdAt', 'deletedAt', 'updatedAt'] },
      include: ['user']
    },
    scopes: {
      parentInfo: {
        attributes: { exclude: ['createdAt', 'deletedAt', 'updatedAt'] },
        include: ['parent']
      }
    }
  });
  user_kindred.associate = function (models) {
    user_kindred.belongsTo(models.user.scope('familyInfo'), {
      foreignKey: 'member_id',
      as: 'user'
    });
    user_kindred.belongsTo(models.user.scope('familyInfo'), {
      foreignKey: 'user_id',
      as: 'parent'
    });
    user_kindred.belongsTo(models.family_access, {
      foreignKey: 'member_id',
      targetKey: 'permitted_to',
      as: 'permissions'
    });
  };
  return user_kindred;
};
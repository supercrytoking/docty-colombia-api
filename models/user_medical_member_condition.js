'use strict';
module.exports = (sequelize, DataTypes) => {
  const family_medical_condition = sequelize.define('family_medical_condition', {
    user_id: DataTypes.INTEGER,
    member_id: DataTypes.INTEGER,
    response: DataTypes.JSON,
    deleted_at: DataTypes.DATE,
    added_by_admin: DataTypes.INTEGER,
    change_by: DataTypes.INTEGER,
    reference_id: DataTypes.STRING
  }, {
    paranoid: true,
    deletedAt: 'deleted_at'
  });
  family_medical_condition.associate = function (models) {
    // associations can be defined here
    family_medical_condition.belongsTo(models.user.scope('minimalInfo'), {
      foreignKey: 'change_by', as: 'change_by_user'
    })
    family_medical_condition.belongsTo(models.admin, {
      foreignKey: "added_by_admin",
      as: "added_by_admin_user",
    })
  };
  return family_medical_condition;
};
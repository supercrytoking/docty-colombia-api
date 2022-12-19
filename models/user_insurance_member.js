'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_insurance_member = sequelize.define('user_insurance_member', {
    user_id: DataTypes.INTEGER,
    insurance_id: DataTypes.INTEGER,
    member_id: DataTypes.INTEGER,
    isCovered: DataTypes.BOOLEAN,
    isPrimary: DataTypes.BOOLEAN,
    policy_number: DataTypes.STRING
  }, {});
  user_insurance_member.associate = function (models) {
    user_insurance_member.belongsTo(models.user_family, {
      foreignKey: 'member_id', as: 'family_member'
    });
  };
  return user_insurance_member;
};
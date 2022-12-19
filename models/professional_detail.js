'use strict';
module.exports = (sequelize, DataTypes) => {
  const professional_detail = sequelize.define('professional_detail', {
    skills: DataTypes.JSON,
    company_id: DataTypes.INTEGER,
    designation: DataTypes.INTEGER,
    joining_date: DataTypes.DATE,
    user_id: DataTypes.INTEGER,
    added_by: DataTypes.INTEGER,
    manager: DataTypes.INTEGER
  }, {});
  professional_detail.associate = function (models) {
    // associations can be defined here
    professional_detail.belongsTo(models.coporateDisignation, {
      foreignKey: 'designation',
      as: 'user_designation'
    })
  };
  return professional_detail;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const approval_review = sequelize.define('approval_review', {
    section: DataTypes.STRING,
    section_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    status: DataTypes.BOOLEAN,
    user_id: DataTypes.INTEGER,
    remark: DataTypes.TEXT,
    file: DataTypes.STRING,
    reviewer: DataTypes.INTEGER
  }, {});
  approval_review.associate = function (models) {
    approval_review.belongsTo(models.admin, {
      foreignKey: 'reviewer',
      as: 'review_manager'
    });
    approval_review.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    })
  };
  return approval_review;
};
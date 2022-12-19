'use strict';
const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  const review = sequelize.define('review', {
    patient_id: DataTypes.INTEGER,
    doctor_id: DataTypes.INTEGER,
    ratings: DataTypes.FLOAT,
    review: DataTypes.TEXT,
    ratings_platform: DataTypes.FLOAT,
    review_platform: DataTypes.TEXT,
    booking_id: DataTypes.INTEGER,
    deleted_at: DataTypes.DATE,
    enabled: DataTypes.BOOLEAN,
    // family_member_id: DataTypes.INTEGER
  }, {});
  review.associate = function (models) {
    // associations can be defined here
    review.belongsTo(models.user, {
      foreignKey: 'patient_id',
      as: 'reviewer'
    });
    review.belongsTo(models.user_family, {
      foreignKey: 'family_member_id',
      as: 'reviewer_family_member'
    });
    review.belongsTo(models.user, {
      foreignKey: 'doctor_id',
      as: 'review_for'
    });
  };
  sequelizePaginate.paginate(review);

  return review;
};
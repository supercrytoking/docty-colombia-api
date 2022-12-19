'use strict';
module.exports = (sequelize, DataTypes) => {
  const ratingSummary = sequelize.define('rating_summary', {
    user_id: DataTypes.INTEGER,
    rating: DataTypes.DECIMAL(3, 2),
    reviews: DataTypes.INTEGER
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  ratingSummary.associate = function (models) {
    // associations can be defined here
  };
  return ratingSummary;
};
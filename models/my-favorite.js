'use strict';
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
module.exports = (sequelize, DataTypes) => {
  const my_favorite = sequelize.define('my_favorite', {
    user_id: DataTypes.INTEGER,
    provider_id: DataTypes.INTEGER,
    deleted_at: DataTypes.DATE
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      where: { deleted_at: { [Op.eq]: null } }
    }
  });
  my_favorite.associate = function (models) {
    
  };
  return my_favorite;
};
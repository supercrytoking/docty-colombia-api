'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_practice = sequelize.define('user_practice', {
    user_id: DataTypes.INTEGER,
    field: DataTypes.STRING,
    institute: DataTypes.STRING,
    from: DataTypes.DATE,
    to: DataTypes.DATE,
    description: DataTypes.TEXT,
    overview: DataTypes.TEXT,
    title: DataTypes.STRING,
    practice_type: DataTypes.STRING,
    document: DataTypes.TEXT,
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  user_practice.associate = function (models) {
    // associations can be defined here
  };
  return user_practice;
};
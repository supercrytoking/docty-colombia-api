'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_education = sequelize.define('user_education', {
    user_id: DataTypes.INTEGER,
    degree: DataTypes.STRING,
    institute: DataTypes.STRING,
    from: DataTypes.DATE,
    to: DataTypes.DATE,
    field_of_study: DataTypes.STRING,
    description: DataTypes.TEXT,
    activities: DataTypes.TEXT,
    grade: DataTypes.STRING,
    document: DataTypes.TEXT,
    status: DataTypes.INTEGER
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  user_education.associate = function (models) {
    // associations can be defined here
  };
  return user_education;
};
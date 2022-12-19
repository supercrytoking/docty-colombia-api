'use strict';
module.exports = (sequelize, DataTypes) => {
  const questionnaires = sequelize.define('user_questionnaires', {
    type: { type: DataTypes.STRING, trim: true },
    question: { type: DataTypes.STRING, trim: true },
    category: { type: DataTypes.STRING, trim: true },
    name: { type: DataTypes.STRING, trim: true },
    description: { type: DataTypes.STRING, trim: true },
    language: { type: DataTypes.STRING, trim: true },
    options: DataTypes.JSON,
    filter: DataTypes.JSON,
    extras: DataTypes.JSON,
    order_no: DataTypes.INTEGER,
    group: DataTypes.INTEGER
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    },
    freezeTableName: true
  });
  questionnaires.associate = function (models) {
    // associations can be defined here
  };
  return questionnaires;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const slider = sequelize.define('slider', {
    title: DataTypes.STRING,
    content: DataTypes.STRING,
    language: DataTypes.STRING,
    user_role: DataTypes.INTEGER,
    image: DataTypes.STRING,
    button: DataTypes.STRING,
    link: DataTypes.STRING,
    status: DataTypes.BOOLEAN
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    },
    scopes: {
      activeOnly: {
        where: {
          status: true
        }
      }
    }
  });
  slider.associate = function (models) {
    // associations can be defined here
  };
  return slider;
};
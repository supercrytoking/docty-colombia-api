'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_skill = sequelize.define('user_skill', {
    user_id: DataTypes.INTEGER,
    category: { type: DataTypes.STRING, trim: true },
    skills: DataTypes.TEXT,
    certified: { type: DataTypes.STRING, trim: true },
    from: DataTypes.DATE,
    to: DataTypes.DATE,
    title: { type: DataTypes.STRING, trim: true },
    overview: DataTypes.TEXT,
    document: DataTypes.TEXT
  }, {});
  user_skill.associate = function (models) {
    // associations can be defined here
  };
  return user_skill;
};
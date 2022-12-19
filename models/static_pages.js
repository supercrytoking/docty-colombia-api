'use strict';
var slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const satic_pages = sequelize.define('static_page_detail', {
    name: DataTypes.STRING,
    language: DataTypes.STRING,
    content: DataTypes.TEXT,
    code: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
    isPublished: DataTypes.BOOLEAN,
    version: DataTypes.INTEGER,
  }, {
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    },
    setterMethods: {
      code: function (value) {
        let v = slugify(value, "_");
        this.setDataValue('code', v.toLowerCase());
      }
    }
  });
  satic_pages.associate = function (models) {
    // associations can be defined here
  };
  return satic_pages;
};
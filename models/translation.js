'use strict';
var slugify = require('slugify')

module.exports = (sequelize, DataTypes) => {
  const translation = sequelize.define('translation', {
    keyword: DataTypes.STRING,
    section: DataTypes.STRING,
    en: DataTypes.TEXT,
    es: DataTypes.TEXT
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    },
    setterMethods: {
      keyword: function (value) {
        let v = slugify(value, "_");
        this.setDataValue('keyword', v.toUpperCase());
      }
    }
  });
  translation.associate = function (models) {
    // associations can be defined here
  };
  return translation;
};
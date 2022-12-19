'use strict';
var slugify = require('slugify');

module.exports = (sequelize, DataTypes) => {
  const static_page_type = sequelize.define('static_page_type', {
    page_code: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
    version: DataTypes.INTEGER,
    details: DataTypes.TEXT,
  }, {
    paranoid: true,
    setterMethods: {
      page_code: function (value) {
        let v = slugify(value, "_");
        this.setDataValue('page_code', v.toLowerCase());
      }
    }
  });
  static_page_type.associate = function (models) {
    // associations can be defined here
  };
  return static_page_type;
};
'use strict';
var slugify = require('slugify')

module.exports = (sequelize, DataTypes) => {
  const dropdown_types = sequelize.define('dropdown_types', {
    name: DataTypes.STRING,
    code: DataTypes.STRING
  }, {

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
  dropdown_types.associate = function (models) {
    // associations can be defined here
  };
  return dropdown_types;
};
'use strict';
var slugify = require('slugify');
module.exports = (sequelize, DataTypes) => {
  const section = sequelize.define('section', {
    code: DataTypes.STRING,
    name: DataTypes.STRING
  }, {
      defaultScope:{
        attributes:{exclude:['createdAt','updatedAt']}
      },
    setterMethods: {
      code: function (value) {
        let v = slugify(value, "_");
        this.setDataValue('code', v.toUpperCase());
      }
    }
  });
  section.associate = function(models) {
    // associations can be defined here
  };
  return section;
};
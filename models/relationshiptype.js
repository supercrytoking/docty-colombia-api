'use strict';
module.exports = (sequelize, DataTypes) => {
  const relationshipType = sequelize.define('relationshipType', {
    name: DataTypes.STRING
  }, {});
  relationshipType.associate = function(models) {
    // associations can be defined here
  };
  return relationshipType;
};
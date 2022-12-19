'use strict';
module.exports = (sequelize, DataTypes) => {
  const documentType = sequelize.define('documentType', {
    name: DataTypes.STRING
  }, {});
  documentType.associate = function(models) {
    // associations can be defined here
  };
  return documentType;
};
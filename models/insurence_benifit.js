'use strict';
const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  const insurence_benifit = sequelize.define('insurence_benifit', {
    name: DataTypes.STRING,
    description: DataTypes.TEXT
  }, {
    defaultScope:{
      attributes:{exclude:['createdAt','updatedAt']}
    }
  });
  insurence_benifit.associate = function(models) {
    
  };
  sequelizePaginate.paginate(insurence_benifit);

  return insurence_benifit;
};
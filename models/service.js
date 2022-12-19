'use strict';
module.exports = (sequelize, DataTypes) => {
  const service = sequelize.define('service', {
    description: DataTypes.INTEGER,
    service: DataTypes.STRING
  }, {underScore:true});
  service.associate = function (models) {
    // service.belongsToMany(models.user,{
    //   foreignKey:'service_id',
    //   through:'user_service',
    //   as:'user'
    // })
  };
  return service;
};
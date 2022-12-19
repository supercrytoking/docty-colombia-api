'use strict';

module.exports = (sequelize, DataTypes) => {
  const activity_log = sequelize.define('activity_log', {
    user_id: DataTypes.INTEGER,
    by_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    details: DataTypes.STRING,
    data: {
      type: DataTypes.JSON,
      // get(){
      //   if(typeof this.data != 'object'){
      //     return JSON.parse(this.data);
      //   }else{
      //     return this.data;
      //   }
      // }
    }
  }, {
    defaultScope: {
      attributes: { exclude: ['updatedAt'] }
    }
  });
  activity_log.associate = function (models) {
    // associations can be defined here
    activity_log.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user',
    });
    activity_log.belongsTo(models.user, {
      foreignKey: 'by_id',
      as: 'by',
    });

  };
  return activity_log;
};
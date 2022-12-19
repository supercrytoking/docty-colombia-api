'use strict';

module.exports = (sequelize, DataTypes) => {
  const medicine_custom = sequelize.define('medicine_custom', {
    user_id: DataTypes.INTEGER,
    medicine_id: DataTypes.INTEGER,
    
  }, {
  
  });
  medicine_custom.associate = function (models) {
    // associations can be defined here
    medicine_custom.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return medicine_custom;
};
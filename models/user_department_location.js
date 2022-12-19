'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_department_location = sequelize.define('user_department_location', {
    department_id: DataTypes.INTEGER,
    location_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    user_department_id:  DataTypes.INTEGER,
  }, {
    underScore:true
  });
  user_department_location.associate = function(models) {
    // associations can be defined here
  };
  return user_department_location;
};
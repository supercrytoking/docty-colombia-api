'use strict';
module.exports = (sequelize, DataTypes) => {
  const pricing = sequelize.define('pricing', {
    department_id: DataTypes.INTEGER,
    speciality_id: DataTypes.INTEGER,
    counselling_type: DataTypes.INTEGER,
    slot_id: DataTypes.INTEGER,
    cost: DataTypes.FLOAT,
    status: DataTypes.STRING,
    deleted_at: DataTypes.DATE
  }, {});
  pricing.associate = function(models) {
    // associations can be defined here
  };
  return pricing;
};
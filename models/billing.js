'use strict';
module.exports = (sequelize, DataTypes) => {
  const billing = sequelize.define('billing', {
    cid:DataTypes.INTEGER,
    payment_mod: DataTypes.STRING,
    currency: DataTypes.STRING,
    amount: DataTypes.FLOAT
  }, {});
  billing.associate = function(models) {
    billing.belongsTo(models.councelling, {
      foreignKey: 'cid',
      as: 'counselling_id'
    });
  };
  return billing;
};
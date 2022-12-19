'use strict';
module.exports = (sequelize, DataTypes) => {
  const stock = sequelize.define('stock', {
    user_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    type: DataTypes.STRING,
    manufacturer: DataTypes.STRING,
    mfg_date: DataTypes.DATE,
    exp_date: DataTypes.DATE,
    used_for: DataTypes.TEXT,
    quantity: DataTypes.INTEGER,
    location_id: DataTypes.INTEGER
  }, {});
  stock.associate = function (models) {
    stock.belongsTo(models.location, {
      foreignKey: 'location_id',
      as: 'location'
    })
  };
  return stock;
};
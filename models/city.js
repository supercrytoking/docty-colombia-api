'use strict';
module.exports = (sequelize, DataTypes) => {
  const city = sequelize.define('city', {
    name: DataTypes.STRING,
    state_id: DataTypes.INTEGER,
    code: { type: DataTypes.INTEGER },
    short_name: { type: DataTypes.STRING },
  }, {});
  city.associate = function (models) {
    city.belongsTo(models.state, { foreignKey: 'state_id', as: 'state' })
  };
  return city;
};
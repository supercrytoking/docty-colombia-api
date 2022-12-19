'use strict';
module.exports = (sequelize, DataTypes) => {
  const state = sequelize.define('state', {
    name: DataTypes.STRING,
    country_id: DataTypes.INTEGER,
    code: { type: DataTypes.INTEGER },
    short_name: { type: DataTypes.STRING }
  }, {});
  state.associate = function (models) {
    state.belongsTo(models.country, { foreignKey: 'country_id', as: 'country' })
  };
  return state;
};
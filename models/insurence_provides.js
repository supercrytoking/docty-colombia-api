'use strict';
const sequelizePaginate = require('sequelize-paginate');
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}

module.exports = (sequelize, DataTypes) => {
  const insurence_provider = sequelize.define('insurence_provider', {
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    country_id: DataTypes.INTEGER,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      set(value) {
        let v = (value || '').toLowerCase();
        this.setDataValue('status', (status[v] || 0));
      },
      get() {
        let v = this.getDataValue('status');
        return (v == true ? 'enable' : 'disable')
      }
    }
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      include: ['insurence_service_country']
    }
  });
  insurence_provider.associate = function (models) {
    insurence_provider.belongsTo(models.country, {
      foreignKey: 'country_id',
      as: 'insurence_service_country'
    })
  };
  sequelizePaginate.paginate(insurence_provider);
  return insurence_provider;
};
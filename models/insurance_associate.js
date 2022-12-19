'use strict';
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}
module.exports = (sequelize, DataTypes) => {
  const insurance_associate = sequelize.define('insurance_associate', {
    user_id: DataTypes.INTEGER,
    provider_id: DataTypes.INTEGER,
    benefits: DataTypes.JSON,
    overview: DataTypes.TEXT,
    support_agent: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
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
      include: ['provider']
    }
  });
  insurance_associate.associate = function (models) {
    insurance_associate.belongsTo(models.insurence_provider, {
      foreignKey: 'provider_id',
      as: 'provider'
    })
  };
  return insurance_associate;
};
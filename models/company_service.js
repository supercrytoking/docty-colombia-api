'use strict';
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}
module.exports = (sequelize, DataTypes) => {
  const company_service = sequelize.define('company_service', {
    user_id: DataTypes.INTEGER,
    type: {
      type: DataTypes.INTEGER,
      defaultValue: 0 // 0: General Pricing, 1: Insurance Pricing
    },
    insurance_provider_id: DataTypes.INTEGER,
    expertise_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0 // 0: general, 1: specialist
    },
    user_department_id: DataTypes.INTEGER,
    user_speciality_id: DataTypes.INTEGER,
    type_code: DataTypes.STRING,

    insured_cover: DataTypes.INTEGER,
    copay: DataTypes.INTEGER,
    total: DataTypes.INTEGER,

    details: DataTypes.TEXT,
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
  }, { underScore: true });
  company_service.associate = function (models) {
    company_service.belongsTo(models.insurence_provider, {
      foreignKey: 'insurance_provider_id',
      as: 'insurence_provider',
    });
    company_service.belongsTo(models.user_department, {
      foreignKey: 'user_department_id',
      as: 'user_department',
    });
    company_service.belongsTo(models.user_speciality, {
      foreignKey: 'user_speciality_id',
      as: 'user_speciality',
    });

    company_service.belongsTo(models.consultation_type_detail, {
      foreignKey: 'type_code',
      targetKey: 'type_code',
      as: 'consultation_type_detail',
    });

    company_service.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'company',
    });
  };
  return company_service;
};
'use strict';
const sequelizePaginate = require('sequelize-paginate');
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}
module.exports = (sequelize, DataTypes) => {
  const medicine = sequelize.define('medicine', {
    proceedings: DataTypes.STRING,
    product: DataTypes.STRING,
    holderCompany: DataTypes.STRING,
    healthRegister: DataTypes.STRING,
    expeditionDate: DataTypes.STRING,
    expirationDate: DataTypes.STRING,
    registrationStatus: DataTypes.STRING,
    quantityCum: DataTypes.INTEGER,
    commercialDescription: DataTypes.STRING,
    cumState: DataTypes.STRING,
    unit: DataTypes.STRING,
    ATC: DataTypes.STRING,
    descriptionATC: DataTypes.STRING,
    viaAdministration: DataTypes.STRING,
    concentration: DataTypes.STRING,
    activePrinciple: DataTypes.STRING,
    unitMeasured: DataTypes.STRING,
    quantity: DataTypes.INTEGER,
    referenceUnit: DataTypes.STRING,
    pharmaceuticalForm: DataTypes.STRING,
    roleName: DataTypes.STRING,
    roleType: DataTypes.STRING,
    modality: DataTypes.STRING,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    getterMethods: {
      status: function () {
        let v = this.getDataValue('status');
        return (v == true ? 'enable' : 'disable')
      }
    },
    setterMethods: {
      status: function (value) {
        let v = (value || '').toLowerCase();
        this.setDataValue('status', (status[v] || 0));
      }
    }
  });
  medicine.associate = function (models) {
    // associations can be defined here
    medicine.hasOne(models.medicine_custom, {
      foreignKey: 'medicine_id',
      as: 'medicine_custom'
    });
  };

  sequelizePaginate.paginate(medicine);
  return medicine;
};
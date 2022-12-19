'use strict';
module.exports = (sequelize, DataTypes) => {
  const contract_template = sequelize.define('contract_template', {
    type_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    html: DataTypes.TEXT,
    html_es: DataTypes.TEXT,
    language: { type: DataTypes.STRING, defaultValue: 'en', trim: true },
    end: DataTypes.DATE, // limitation to sign the contracts within specified duration once the contract has some changed from the legal team
    version: { type: DataTypes.INTEGER },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
    remarks: { type: DataTypes.TEXT },
  }, {});
  contract_template.associate = function (models) {
    // associations can be defined here
    contract_template.belongsTo(models.contractType, {
      foreignKey: 'type_id', as: 'contractType'
    });
  };
  return contract_template;
};
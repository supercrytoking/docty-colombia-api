'use strict';
module.exports = (sequelize, DataTypes) => {
  const contractType = sequelize.define('contractType', {
    name: { type: DataTypes.STRING, trim: true }
  }, {});
  contractType.associate = function (models) {
    contractType.hasOne(models.contract_template,
      {
        foreignKey: 'type_id',
        as: 'contract_template',
        where: {
          isActive: true
        }
      }
    );
  };
  return contractType;
};
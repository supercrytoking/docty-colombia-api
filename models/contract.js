'use strict';

const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  const contract = sequelize.define('contract', {
    title: { type: DataTypes.STRING, trim: true },
    type: { type: DataTypes.STRING, trim: true },
    content: DataTypes.TEXT,
    valid_from: DataTypes.DATE,
    valid_to: DataTypes.DATE,
    status: { type: DataTypes.STRING, trim: true },
    url: DataTypes.TEXT,
    other_details: DataTypes.TEXT
  }, {});
  contract.associate = function (models) {
    // associations can be defined here
    contract.hasOne(models.user_contract, {
      foreignKey: {
        name: 'contract_id',
        fieldName: 'contract_id'
      }
    });
  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(contract);

  return contract;
};
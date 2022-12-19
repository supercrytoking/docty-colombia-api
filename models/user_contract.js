'use strict';
const sequelizePaginate = require('sequelize-paginate');

module.exports = (sequelize, DataTypes) => {
  const user_contract = sequelize.define('user_contract', {
    user_id: DataTypes.INTEGER,
    contract_id: DataTypes.INTEGER,
    status: DataTypes.STRING,
    other_details: DataTypes.TEXT
  }, {});
  user_contract.associate = function(models) {
    // associations can be defined here
  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(user_contract);

  return user_contract;
};
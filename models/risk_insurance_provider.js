'use strict';
module.exports = (sequelize, DataTypes) => {
  const risk_insurance_provider = sequelize.define('risk_insurance_provider', {
    user_id: DataTypes.INTEGER,
    company_name: DataTypes.STRING,
    start_at: DataTypes.DATE,
    policy_number: DataTypes.STRING,
    expired_on: DataTypes.DATE,
    file: DataTypes.STRING
  }, {});
  risk_insurance_provider.associate = function (models) {
    // associations can be defined here
  };
  return risk_insurance_provider;
};
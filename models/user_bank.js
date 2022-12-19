'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_bank = sequelize.define('user_bank', {
    user_id: DataTypes.INTEGER,
    bank_type: DataTypes.INTEGER,
    bank_id: DataTypes.INTEGER,
    bank_name: DataTypes.STRING,
    account_number: DataTypes.STRING,
  }, {
    defaultScope: {
      attributes: { exclude: [] },
      include: ['bank']
    }
  });
  user_bank.associate = function (models) {
    user_bank.belongsTo(models.bank, {
      foreignKey: 'bank_id', as: 'bank'
    });
  };
  return user_bank;
};
'use strict';
module.exports = (sequelize, DataTypes) => {
  const signedContract = sequelize.define('signedContract', {
    contractID: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    signedDateAndTime: DataTypes.DATE,
    contractPDF: DataTypes.STRING,
    signature: DataTypes.STRING,
    end: DataTypes.DATE,
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    user_profile_update_id: DataTypes.INTEGER,
  }, {});
  signedContract.associate = function (models) {
    // associations can be defined here
    signedContract.belongsTo(models.user_profile_log, {
      foreignKey: 'user_profile_update_id',
      as: 'user_profile_log'
    });
  };
  return signedContract;
};
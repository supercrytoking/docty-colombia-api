'use strict';
module.exports = (sequelize, DataTypes) => {
  const userMedicalHistory = sequelize.define('userMedicalHistory', {
    user_id: DataTypes.INTEGER,
    class: DataTypes.STRING,
    response: DataTypes.JSON,
    added_by_admin: DataTypes.INTEGER,
    added_by: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
    notes: DataTypes.STRING,
    dated: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
    reference_id: DataTypes.STRING,
    device_id: DataTypes.STRING,
    device_type: {
      type: DataTypes.STRING,
      defaultValue: 'Manual'
    },
    device_macAddress: DataTypes.STRING,
  }, {
    tableName: 'user_medical_histories',
    paranoid: true
  });
  userMedicalHistory.associate = function (models) {
    userMedicalHistory.belongsTo(models.user, {
      foreignKey: "added_by",
      as: "added_by_user",
    })
    userMedicalHistory.belongsTo(models.admin, {
      foreignKey: "added_by_admin",
      as: "added_by_admin_user",
    })
  };
  return userMedicalHistory;
};
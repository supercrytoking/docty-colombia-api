'use strict';
const status = {
  rejected: 0, accepted: 1, "invoice created": 2, packed: 3, shipped: 4, delivered: 5,
  "0": "rejected", "1": "accepted", "2": "invoice created", "3": "packed", "4": "shipped", "5": "delivered"
}
module.exports = (sequelize, DataTypes) => {
  const prescription = sequelize.define('prescription', {
    reference_id: DataTypes.STRING,
    // patient_id: DataTypes.INTEGER,
    // provider_id: DataTypes.INTEGER,
    // date: DataTypes.DATE,
    diagnostics: DataTypes.JSON,
    medications: DataTypes.JSON,
    file: DataTypes.STRING,
    reminder: DataTypes.BOOLEAN,
    reCounselling: DataTypes.BOOLEAN,
    afterCounsellingPrivateMsg: DataTypes.BOOLEAN,
    followUpDate: DataTypes.DATE,
    followUpComments: DataTypes.TEXT,
    allowSendMessage: DataTypes.BOOLEAN,
    status: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
    therapies: DataTypes.JSON,
    cups: DataTypes.JSON,
    rejectMessage: DataTypes.TEXT,
    recommendations: DataTypes.JSON,
    statusString: {
      type: DataTypes.VIRTUAL,
      get() {
        let v = this.getDataValue('status');
        console.log(v)
        if (!!!v) {
          return null;
        }
        return (status[v] || null)
      }
    }
  }, {});
  prescription.associate = function (models) {

    prescription.belongsTo(models.booking, {
      foreignKey: 'reference_id',
      targetKey: 'reference_id',
      as: 'booking',
    });

    prescription.belongsTo(models.prescription_note, {
      foreignKey: 'reference_id',
      targetKey: 'reference_id',
      as: 'note',
    });

  };
  return prescription;
};
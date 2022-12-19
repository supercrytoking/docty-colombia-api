'use strict';
module.exports = (sequelize, DataTypes) => {
  const invoice = sequelize.define('invoice', {
    invoice_id: DataTypes.STRING,
    from_id: DataTypes.INTEGER,
    from2_id: DataTypes.INTEGER, // co-doctor
    to_id: DataTypes.INTEGER,
    reference_id: DataTypes.STRING,
    booking_id: DataTypes.INTEGER,
    payment_mod: DataTypes.STRING,
    currency: DataTypes.STRING,
    amount: DataTypes.FLOAT,
    status: DataTypes.STRING,
    details: DataTypes.JSON,
    pdf: DataTypes.STRING,
    discount: DataTypes.FLOAT,
    insurance_cover: DataTypes.FLOAT,
  }, {});
  invoice.associate = function (models) {
    invoice.belongsTo(models.user, {
      foreignKey: 'from_id',
      as: 'from',//provider
    });
    invoice.belongsTo(models.user, {
      foreignKey: 'from2_id',
      as: 'from2',//co-doctor
    });
    invoice.belongsTo(models.user, {
      foreignKey: 'to_id',
      as: 'to',//patient
    });
    invoice.belongsTo(models.booking, {
      foreignKey: 'booking_id',
      as: 'booking',
    });

  };
  return invoice;
};
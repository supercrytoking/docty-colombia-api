'use strict';
module.exports = (sequelize, DataTypes) => {
  const clinic_pharmacy = sequelize.define('clinic_pharmacy', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    clinic_id: DataTypes.INTEGER,
    pharmacy_id: DataTypes.INTEGER,
    location_id: DataTypes.INTEGER,
    pharmacy_location_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    deletedAt: DataTypes.DATE,
  }, {
    paranoid: true,
  });
  clinic_pharmacy.associate = function (models) {
    clinic_pharmacy.belongsTo(models.user, {
      foreignKey: "clinic_id",
      as: "clinic",
    });
    clinic_pharmacy.belongsTo(models.user.scope('publicInfo'), {
      foreignKey: "pharmacy_id",
      as: "pharmacy",
    })
    clinic_pharmacy.belongsTo(models.location, {
      foreignKey: "location_id",
      as: "location",
    })
    clinic_pharmacy.belongsTo(models.location, {
      foreignKey: "pharmacy_location_id",
      as: "pharmacy_location",
    })
    clinic_pharmacy.hasMany(models.prescription_invoice, {
      foreignKey: "user_id",
      sourceKey: 'pharmacy_id',
      as: "invoices",
    })
    clinic_pharmacy.hasMany(models.booking, {
      foreignKey: "pharmacy",
      sourceKey: 'pharmacy_id',
      as: "bookings",
    })
    clinic_pharmacy.hasMany(models.org_contacts, {
      foreignKey: "user_id",
      sourceKey: 'pharmacy_id',
      as: "org_contacts",
    })
  };
  return clinic_pharmacy;
};
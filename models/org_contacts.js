'use strict';
module.exports = (sequelize, DataTypes) => {
  const org_contacts = sequelize.define('org_contacts', {
    user_id: DataTypes.INTEGER,
    location_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    full_name: DataTypes.STRING,
    phone: DataTypes.STRING,
    email: DataTypes.STRING
  }, {});
  org_contacts.associate = function (models) {
    // associations can be defined here
  };
  return org_contacts;
};
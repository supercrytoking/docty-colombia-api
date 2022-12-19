'use strict';
module.exports = (sequelize, DataTypes) => {
  const location = sequelize.define('location', {
    user_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    type: DataTypes.STRING,
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    media: DataTypes.STRING,
    address: DataTypes.STRING,
    phone: DataTypes.STRING,
    contact_person: DataTypes.STRING,
    country_id: DataTypes.STRING,
    state: DataTypes.STRING,
    city: DataTypes.STRING,
    zip: DataTypes.INTEGER,
    is_24_7_open: DataTypes.BOOLEAN,
    is_head_office: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] },
      include: ['location_open']
    },
    scopes: {
      shortInfo: {
        attributes: ['title', 'address', 'latitude', 'longitude', 'city']
      }
    }
  });
  location.associate = function (models) {
    location.hasMany(models.location_open, {
      foreignKey: 'location_id',
      as: 'location_open'
    });
    location.hasMany(models.customer, {
      foreignKey: 'location_id',
      as: 'customers'
    });
  };
  return location;
};
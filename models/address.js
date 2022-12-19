'use strict';
module.exports = (sequelize, DataTypes) => {
  const address = sequelize.define('address', {
    user_id: DataTypes.INTEGER,
    admin_id: DataTypes.INTEGER,
    // family_id: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: 0
    // },
    address: DataTypes.TEXT,
    latitude: DataTypes.STRING,
    longitude: DataTypes.STRING,
    landmark: DataTypes.STRING,
    house_no: DataTypes.STRING,
    apartment_no: DataTypes.STRING,
    city: DataTypes.STRING,
    state: DataTypes.STRING,
    country: DataTypes.STRING,
    zip: DataTypes.INTEGER,
    title: DataTypes.STRING
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  address.associate = function (models) {
    address.belongsTo(models.user_kindred, {
      foreignKey: 'user_id',
      targetKey: 'member_id',
      as: 'family'
    });
    address.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };
  return address;
};
'use strict';
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}
module.exports = (sequelize, DataTypes) => {
  const offer = sequelize.define('offer', {
    user_id: DataTypes.INTEGER,
    admin_id: DataTypes.INTEGER,
    location_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    details: DataTypes.TEXT,
    offer_price: DataTypes.DECIMAL,
    discount_type: DataTypes.STRING,
    discount: DataTypes.DECIMAL,
    start_at: DataTypes.DATE,
    end_at: DataTypes.DATE,
    image: DataTypes.TEXT,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    },
    getterMethods: {
      status: function () {
        let v = this.getDataValue('status');
        return (v == true ? 'enable' : 'disable')
      }
    },
    setterMethods: {
      status: function (value) {
        let v = (value || '').toLowerCase();
        this.setDataValue('status', (status[v] || 0));
      }
    }
  });
  offer.associate = function (models) {
    // associations can be defined here
    offer.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user',
    });
    offer.belongsTo(models.admin, {
      foreignKey: 'admin_id',
      as: 'admin',
    });
  };
  return offer;
};
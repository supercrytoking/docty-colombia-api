'use strict';
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}
module.exports = (sequelize, DataTypes) => {
  const coupon_utilisation = sequelize.define('coupon_utilisation', {
    user_id: DataTypes.INTEGER,
    admin_id: DataTypes.INTEGER,
    patient_id: DataTypes.INTEGER,
    is_global: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    booking_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    start: DataTypes.DATE,
    end: DataTypes.DATE,
    image: DataTypes.STRING,
    create_code: DataTypes.STRING,
    price: DataTypes.FLOAT,
    type: DataTypes.STRING,
    apply_for_all: DataTypes.BOOLEAN,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    max_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    discount_type: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    location_id: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    defaultScope: {
      attributes: { exclude: ['updatedAt'] }
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
  coupon_utilisation.associate = function (models) {
    // associations can be defined here
    coupon_utilisation.belongsTo(models.user, {
      foreignKey: 'patient_id',
      as: 'patient',
    });
    coupon_utilisation.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user',
    });
    coupon_utilisation.belongsTo(models.admin, {
      foreignKey: 'admin_id',
      as: 'admin',
    });
    coupon_utilisation.belongsTo(models.booking, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    coupon_utilisation.hasMany(models.coupon_history, {
      foreignKey: 'coupon_id',
      as: 'coupon_history',
    });
    coupon_utilisation.belongsTo(models.location, {
      foreignKey: 'location_id',
      as: 'location',
    });
  };
  return coupon_utilisation;
};
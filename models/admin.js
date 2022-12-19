'use strict';

const sequelizePaginate = require('sequelize-paginate');

const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}

module.exports = (sequelize, DataTypes) => {
  const admin = sequelize.define('admin', {
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    phone_number: DataTypes.STRING,
    country_id: DataTypes.INTEGER,
    dob: DataTypes.DATE,
    picture: DataTypes.STRING,
    gender: DataTypes.STRING,
    lang: DataTypes.TEXT,
    role: DataTypes.INTEGER,
    isSuper: DataTypes.BOOLEAN,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    need_password_reset: { type: DataTypes.BOOLEAN, defaultValue: false },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.first_name + ' ' + this.last_name;
      }
    }
  }, {
    sequelize,
    paranoid: true,
    getterMethods: {
      // fullName() {
      //   return this.first_name + ' ' + this.last_name;
      // },
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
    },
    underScore: true,
    defaultScope: {
      attributes: { exclude: ['password', 'deletedAt'] }
    }
  });

  admin.associate = function (models) {
    admin.hasOne(models.address, {
      foreignKey: {
        name: 'admin_id',
        fieldName: 'admin_id'
      },
      as: 'address'
    });
    admin.belongsTo(models.role, {
      foreignKey: 'role',
      as: 'admin_role'
    });
    admin.hasMany(models.associate, {
      foreignKey: 'associate',
      as: 'associate'
    });
    admin.hasMany(models.user_profile_reviewer, {
      foreignKey: 'admin_id',
      as: 'user_profile_reviewer'
    });
  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(admin);

  return admin;
};
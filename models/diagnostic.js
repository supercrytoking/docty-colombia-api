'use strict';
const sequelizePaginate = require('sequelize-paginate');
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}

module.exports = (sequelize, DataTypes) => {
  const diagnostic = sequelize.define('diagnostic', {
    title: DataTypes.STRING,
    cie_3_char: DataTypes.STRING,
    discription: DataTypes.STRING,
    cie_4_char: DataTypes.STRING,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      set(value) {
        let v = (value || '').toLowerCase();
        this.setDataValue('status', (status[v] || 0));
      },
      get() {
        let v = this.getDataValue('status');
        return (v == true ? 'enable' : 'disable')
      }
    }
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    },
    // getterMethods: {
    //   status: function () {
    //     let v = this.getDataValue('status');
    //     return (status[v] || 'enable')
    //   }
    // },
    // setterMethods: {
    //   status: function (value) {
    //     let v = (value || '').toLowerCase();
    //     this.setDataValue('status', (status[v] || 1));
    //   }
    // }
  });
  diagnostic.associate = function (models) {
    // associations can be defined here
  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(diagnostic);
  return diagnostic;
};
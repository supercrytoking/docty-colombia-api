'use strict';
const sequelizePaginate = require('sequelize-paginate');
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}

module.exports = (sequelize, DataTypes) => {
  const procedure = sequelize.define('procedure', {
    section: DataTypes.STRING,
    chapter: DataTypes.STRING,
    group: DataTypes.STRING,
    subgroup: DataTypes.STRING,
    category: DataTypes.STRING,
    process: DataTypes.TEXT,
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
    },
    speciality_type: { // 1: Medical CUPS, 0: Non-Medical CUPS; this column is match with `users` table: speciality_type, `speciality` table: role_id
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  }, {
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    }
  });
  procedure.associate = function (models) {
    procedure.hasMany(models.favorit_procedure, {
      foreignKey: 'procedure_id',
      as: 'favoritOf'
    })
  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(procedure);
  return procedure;
};
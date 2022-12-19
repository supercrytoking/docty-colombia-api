'use strict';
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}
module.exports = (sequelize, DataTypes) => {
  const department = sequelize.define('department', {
    role_id: { // 1: Medical Department, 3: Nurse, 4: Non-Medical Department; this column name will be `type` instead of role_id
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    title: DataTypes.STRING,
    details: DataTypes.TEXT,
    symbol: DataTypes.TEXT,
    deleted_at: DataTypes.DATE,
    title_es: DataTypes.STRING,
    details_es: DataTypes.TEXT,
    tags: DataTypes.STRING,
    colorCode: DataTypes.STRING,
    isDefaultSeleted: DataTypes.BOOLEAN,
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
    }
  });
  department.associate = function (models) {
    department.hasMany(models.speciality,
      {
        foreignKey: 'department_id',
        as: 'specialities'
      }
    );
    department.hasMany(models.user_service, {
      foreignKey: 'department_id',
      as: 'user_service'
    });
  };
  return department;
};
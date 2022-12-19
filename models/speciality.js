'use strict';
const status = {
  disable: 0, enable: 1, "0": "disable", "1": "enable"
}
module.exports = (sequelize, DataTypes) => {
  const speciality = sequelize.define('speciality', {
    role_id: { // 1: Medical Speciality, 3: Nurse, 4: Non-Medical Speciality; this column name will be `type` instead of role_id
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    department_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    details: DataTypes.TEXT,
    symbol: DataTypes.TEXT,
    deleted_at: DataTypes.DATE,
    title_es: DataTypes.STRING,
    details_es: DataTypes.TEXT,
    tags: DataTypes.STRING,
    colorCode: DataTypes.STRING,
    isDefaultSeleted: DataTypes.BOOLEAN,
    category: {
      type: DataTypes.VIRTUAL,
      get() {
        let c = null;
        switch (+this.role_id) {
          case 1:
            c = 'Medical';
            break;
          case 3:
            c = 'Nursing';
            break;
          case 4:
            c = 'NonMedical';
            break;
          default:
        }
        return c;
      }
    },
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
  speciality.associate = function (models) {
    speciality.belongsTo(models.department, {
      foreignKey: 'department_id', as: 'department'
    })
    speciality.hasMany(models.user_service, {
      foreignKey: 'speciality_id',
      as: 'user_service'
    });
    speciality.hasMany(models.booking, {
      foreignKey: 'speciality_id',
      as: 'bookings'
    });
    speciality.hasOne(models.user_speciality, {
      foreignKey: 'speciality_id',
      as: 'user_speciality'
    });
    
  };
  return speciality;
};
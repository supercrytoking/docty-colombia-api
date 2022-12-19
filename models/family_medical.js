'use strict';
module.exports = (sequelize, DataTypes) => {
  const family_medical = sequelize.define('family_medical', {
    user_id: DataTypes.INTEGER,
    family_id: DataTypes.INTEGER,
    height: {
      type: DataTypes.DECIMAL(5, 2),
      get() {
        return this.getDataValue('height') || 0;
      }
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      get() {
        return this.getDataValue('weight') || 0;
      }
    },
    waist: {
      type: DataTypes.DECIMAL(5, 2),
      get() {
        return this.getDataValue('waist') || 0;
      }
    },
    blood_group: DataTypes.STRING,
    weight_unit: DataTypes.STRING,
    height_unit: DataTypes.STRING,
    waist_unit: DataTypes.STRING,
    bmi: DataTypes.DECIMAL(5, 2),
    change_by: DataTypes.INTEGER,
    added_by_admin: DataTypes.INTEGER,
    bmiLabel: {
      type: DataTypes.VIRTUAL,
      get() {
        let bm = this.getDataValue('bmi') || 0;
        bm = parseFloat(bm) || 0;
        if (bm < 18.5) {
          return 'BMI_UNDER_WEIGHT';
        }
        if (bm >= 18.5 && bm <= 25) {
          return 'BMI_FIT';
        }
        if (bm > 25 && bm <= 30) {
          return 'BMI_OVER_WEIGHT';
        }
        if (bm > 30) {
          return 'BMI_OBESE';
        }
      }
    }
  }, {
    paranoid: true,
    deletedAt: 'deleted_at'
  });
  family_medical.associate = function (models) {
    family_medical.belongsTo(models.user, {
      foreignKey: "change_by",
      as: "change_by_user",
    })
    family_medical.belongsTo(models.admin, {
      foreignKey: "added_by_admin",
      as: "added_by_admin_user",
    })
  };
  return family_medical;
};
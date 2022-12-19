'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_medical = sequelize.define('user_medical', {
    user_id: DataTypes.INTEGER,
    height: {
      type: DataTypes.DECIMAL(5, 2),
      get() {
        return this.getDataValue('height') || "0.00";
      }
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      get() {
        return this.getDataValue('weight') || "0.00";
      }
    },
    waist: {
      type: DataTypes.DECIMAL(5, 2),
      get() {
        return this.getDataValue('waist') || "0.00";
      }
    },
    blood_group: DataTypes.STRING,
    weight_unit: DataTypes.STRING,
    waist_unit: DataTypes.STRING,
    height_unit: DataTypes.STRING,
    bmi: {
      type: DataTypes.DECIMAL(5, 2),
      get() {
        return this.getDataValue('bmi') || "0.00";
      }
    },
    deleted_at: DataTypes.DATE,
    change_by: DataTypes.INTEGER,
    added_by_admin: DataTypes.INTEGER,
    reference_id: DataTypes.STRING,
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
  user_medical.associate = function (models) {
    user_medical.belongsTo(models.user, {
      foreignKey: "change_by",
      as: "change_by_user",
    });
    user_medical.belongsTo(models.admin, {
      foreignKey: "added_by_admin",
      as: "added_by_admin_user",
    })
  };
  return user_medical;
};
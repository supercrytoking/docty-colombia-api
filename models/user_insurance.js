'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_insurance = sequelize.define('user_insurance', {
    id: {
      type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true
    },
    user_id: DataTypes.INTEGER,
    type: DataTypes.STRING,
    company: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE,
    cover_letter: DataTypes.TEXT,
    benefits: DataTypes.TEXT,
    card_copy: DataTypes.STRING,
    card_number: DataTypes.STRING,
    // member_id: {
    //   type: DataTypes.INTEGER,
    //   defaultValue: 0
    // },
    added_by_admin: DataTypes.INTEGER,
    addedBy: DataTypes.INTEGER
  }, {
    defaultScope: {
      attributes: { exclude: ['cover_letter'] },
      include: ['insurance_provider']
    }
  });
  user_insurance.associate = function (models) {
    user_insurance.belongsTo(models.insurence_provider, {
      foreignKey: 'company', as: 'insurance_provider'
    });
    user_insurance.belongsTo(models.user, {
      foreignKey: 'user_id', as: 'user'
    });

    user_insurance.hasMany(models.user_insurance_member, {
      foreignKey: 'insurance_id', as: 'members'
    })
    user_insurance.belongsTo(models.admin, {
      foreignKey: "added_by_admin",
      as: "added_by_admin_user",
    })
    user_insurance.belongsTo(models.user, {
      foreignKey: "addedBy",
      as: "added_by_user",
    })
  };
  return user_insurance;
};
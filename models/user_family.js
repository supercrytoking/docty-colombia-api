'use strict';
module.exports = (sequelize, DataTypes) => {
  const user_family = sequelize.define('user_family', {
    user_id: DataTypes.INTEGER,
    first_name: DataTypes.STRING,
    gender: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    phone: DataTypes.STRING,
    last_name: DataTypes.STRING,
    middle_name: DataTypes.STRING,
    national_id: DataTypes.STRING,
    id_proof_type: { type: DataTypes.STRING, trim: true },
    id_proof_copy: { type: DataTypes.STRING, trim: true },
    dob: DataTypes.DATE,
    relation: DataTypes.STRING,
    note: DataTypes.STRING,
    image: DataTypes.STRING,
    allow_access: DataTypes.BOOLEAN,
    ethnicity: DataTypes.INTEGER,
    country_of_birth: DataTypes.INTEGER,
    emergency_contact: DataTypes.INTEGER,
    need_password_reset: { type: DataTypes.BOOLEAN, defaultValue: false },
    municipality_code: { type: DataTypes.INTEGER, trim: true },
    municipality: { type: DataTypes.STRING, trim: true },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.first_name} ${this.middle_name} ${this.last_name}`;
      },

    },
    picture: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.image;
      },
      set(v) {
        this.setDataValue('image', v);
      },

    },
    phone_number: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.phone;
      },
      set(v) {
        this.setDataValue('phone', v);
      },
    }
  }, {
    paranoid: true,
    defaultScope: {
      attributes: {
        exclude: [
          "password",
          "updatedAt",
          "deletedAt",
        ],
      },
    },
  });
  user_family.associate = function (models) {
    user_family.hasOne(models.user_insurance, {
      foreignKey: 'member_id',
      as: 'family_insurance'
    });
    user_family.hasMany(models.user_insurance, {
      foreignKey: 'member_id',
      as: 'insurances'
    });
    user_family.hasMany(models.user_insurance_member, {
      foreignKey: 'member_id', as: 'groupInsurances'
    })
    user_family.hasOne(models.address, {
      foreignKey: 'family_id',
      as: 'family_address'
    });
    user_family.hasOne(models.address, {
      foreignKey: 'family_id',
      as: 'address'
    });
    user_family.belongsTo(models.user, {
      foreignKey: 'user_id',
      as: 'user'
    });
    user_family.hasMany(models.user_document, {
      foreignKey: 'family_id',
      as: 'family_document'
    });
    user_family.hasOne(models.family_medical, {
      foreignKey: 'family_id',
      as: 'family_medical'
    });
    user_family.hasOne(models.family_medical_condition, {
      foreignKey: 'member_id',
      as: 'medical_conditions'
    });
    user_family.hasOne(models.customer, {
      foreignKey: "customer",
      sourceKey: 'user_id',
      as: "customeredTo",
    });
    user_family.hasMany(models.userMedicalHistory, {
      foreignKey: "family_id",
      as: "userMedicalHistory",
    });
  };
  return user_family;
};
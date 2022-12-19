/* eslint-disable eqeqeq */
"use strict";
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const sequelizePaginate = require("sequelize-paginate");

module.exports = (sequelize, DataTypes) => {
  const userFamilyView = sequelize.define(
    "userFamilyView",
    {
      first_name: { type: DataTypes.STRING, trim: true },
      middle_name: { type: DataTypes.STRING, trim: true },
      last_name: { type: DataTypes.STRING, trim: true },
      last_name_2: { type: DataTypes.STRING, trim: true },
      email: { type: DataTypes.STRING, trim: true },
      password: { type: DataTypes.STRING, trim: true },
      national_id: { type: DataTypes.STRING, trim: true },
      city_code: DataTypes.STRING,
      phone_number: { type: DataTypes.STRING, trim: true },
      status: { type: DataTypes.INTEGER, defaultValue: 0 },
      status_personal_information: DataTypes.INTEGER,
      device_id: { type: DataTypes.STRING, trim: true },
      device_type: { type: DataTypes.STRING, trim: true },
      thumbnail: { type: DataTypes.STRING, trim: true },
      dob: DataTypes.DATE,
      isd_code: { type: DataTypes.STRING, trim: true },
      picture: { type: DataTypes.STRING, trim: true },
      overview: DataTypes.TEXT,
      country_id: DataTypes.INTEGER,
      gender: { type: DataTypes.STRING, trim: true },
      lang: { type: DataTypes.STRING, trim: true },
      email_verified: DataTypes.BOOLEAN,
      state_id: DataTypes.INTEGER,
      emergency_contact: DataTypes.INTEGER,
      ethnicity_id: { type: DataTypes.STRING, trim: true },
      ethnicity_others: { type: DataTypes.STRING, trim: true },
      country_of_birth: DataTypes.INTEGER,
      need_password_reset: { type: DataTypes.BOOLEAN, defaultValue: false },
      first_login: { type: DataTypes.BOOLEAN, defaultValue: true },
      suspend_remarks: DataTypes.TEXT, // this is no use, will remove soon
      is_profile_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
      timezone_offset: { type: DataTypes.INTEGER, defaultValue: 0 },
      id_proof_type: { type: DataTypes.STRING, trim: true },
      id_proof_copy: { type: DataTypes.STRING, trim: true },
      telephone_1: { type: DataTypes.STRING, trim: true },
      telephone_2: { type: DataTypes.STRING, trim: true },
      municipality_code: { type: DataTypes.INTEGER, trim: true },
      municipality: { type: DataTypes.STRING, trim: true },
      allow_access: DataTypes.BOOLEAN,
      password_expiry: {
        type: DataTypes.DATE,
      },
      fullName: {
        type: DataTypes.VIRTUAL,
        get() {
          let prefix = "";
          let d = this.user_role;
          let role = d ? d.role_id : 0;
          if (!!role && role == 1) {
            if (this.gender && this.gender.toLowerCase() == "male") {
              prefix = "Dr. ";
            } else {
              prefix = "Dra. ";
            }
          }

          if (!!role && (role == 5 || role == 6 || role == 4 || role == 13)) {
            // clinic or pharmacy
            return this.company_name;
          }
          let n = `${prefix}${this.first_name || ""}${this.middle_name ? " " + this.middle_name : ""
            } ${this.last_name || ""}`;
          return n.trim();
        },
        // set(value) {
        //   throw new Error('Do not try to set the `fullName` value!');
        // }
      },
      isPasswordSet: {
        type: DataTypes.VIRTUAL,
        get() {
          return !!this.password;
        },
      },
    },
    {
      sequelize,
      associations: true,
      charset: "utf8",
      collate: "utf8_unicode_ci",
      paranoid: true,
      underScore: true,
      tableName: 'user_family_view',
      defaultScope: {
        attributes: {
          exclude: [
            "password",
            "device_type",
            "device_id",
            "updatedAt",
            "deletedAt",
          ],
        },
        include: ['emergency_contact_person']
        // attributes:['id','first_name', 'last_name', 'middle_name','gender', 'dob','company_name','picture','overview','website'] ,
      },
      scopes: {
        unlimited: {
          attributes: {
            exclude: [
              "password",
              "device_type",
              "device_id",
              "updatedAt",
              "deletedAt",
            ],
          },
        },
        publicInfo: {
          attributes: [
            "first_name",
            "last_name",
            "middle_name",
            "gender",
            "dob",
            "company_name",
            "picture",
            "id",
            "email",
            "fullName",
            "overview",
            "expertise_level",
            "lang",
            "speciality_type", 'emergency_contact', 'parent'
          ],
        },
        availableStatus: {
          attributes: ["isAvailableStatus"],
        },
        idInfo: {
          attributes: [
            "national_id",
            "id_proof_type",
            "lang",
            "ethnicity_id",
            "ethnicity_others",
          ],
        },
        minimalInfo: {
          attributes: [
            "first_name",
            "last_name",
            "middle_name",
            "gender",
            "dob",
            "company_name",
            "picture",
            "id",
            "fullName",
          ],
        },
        contactInfo: {
          attributes: ["isd_code", "phone_number", "email"],
        },
        publicCompanyInfo: {
          attributes: ["website", "company_name", "picture", "id", "email"],
        },
        familyInfo: {
          attributes: ['id', 'first_name', 'gender', 'email', 'phone_number', 'last_name', 'middle_name', 'national_id', 'dob', 'overview', 'picture', 'ethnicity_id', 'country_of_birth', 'fullName', 'createdAt', 'isd_code', 'emergency_contact', 'relation'
          ],
        },
        emergencycontactInfo: {
          attributes: ['id', 'first_name', 'email', 'phone_number', 'last_name', 'middle_name', 'overview', 'picture', 'fullName', 'isd_code', 'emergency_contact']
        },
        timezone: {
          attributes: ["timezone_offset"],
        },
      },
      hooks: {
        // afterUpdate(instance, options) {
        //   let changed = instance._changed;
        //   console.log(changed, options);
        //   if (!!changed && !!changed.password) {
        //     console.log(changed.password);
        //     // instance.update({ password_expiry: new Date() });
        //   }
        // }
      },
    }
  );

  userFamilyView.associate = function (models) {
    userFamilyView.hasMany(models.activity_log, {
      foreignKey: {
        name: "user_id",
        fieldName: "user_id",
      },
      as: "activity_log",
    });
    userFamilyView.hasOne(models.user_role, {
      foreignKey: {
        name: "user_id",
        fieldName: "user_id",
      },
    });
    userFamilyView.hasOne(models.my_favorite, {
      foreignKey: {
        name: "provider_id",
        fieldName: "provider_id",
      },
      as: "favorites",
    });
    userFamilyView.hasMany(models.user_kindred, {
      foreignKey: 'user_id',
      as: 'families'
    });
    userFamilyView.belongsToMany(models.userFamilyView.scope('familyInfo'), {
      foreignKey: 'user_id',
      otherKey: 'member_id',
      through: models.user_kindred,
      as: 'family'
    });

    userFamilyView.belongsTo(models.userFamilyView.scope('emergencycontactInfo'), {
      foreignKey: "emergency_contact",
      as: "emergency_contact_person",
    });

    userFamilyView.hasOne(models.user_medical, {
      foreignKey: {
        name: "user_id",
        fieldName: "user_id",
      },
      as: "user_medical",
    });
    userFamilyView.hasOne(models.address, {
      foreignKey: {
        name: "user_id",
        fieldName: "user_id",
      },
      as: "address",
    });

    userFamilyView.hasOne(models.user_insurance, {
      foreignKey: "user_id",
      as: "insurance",
    });
    userFamilyView.hasMany(models.user_insurance, {
      foreignKey: "user_id",
      as: "insurances",
      where: { member_id: 0 },
    });
    userFamilyView.belongsToMany(models.insurence_provider, {
      foreignKey: "user_id",
      through: 'user_insurance',
      otherKey: 'company',
      as: "insurance_provider",
    });

    userFamilyView.belongsTo(models.country, {
      foreignKey: "country_id",
      as: "country",
    });
    userFamilyView.belongsTo(models.state, {
      foreignKey: "state_id",
      as: "state",
    });

    userFamilyView.hasOne(models.address, {
      foreignKey: "user_id",
      as: "user_address",
    });

    userFamilyView.hasMany(models.user_document, {
      foreignKey: "user_id",
      as: "documents",
    });
    userFamilyView.hasOne(models.user_medical_condition, {
      foreignKey: "user_id",
      as: "medical_conditions",
    });
    // return staff list
    userFamilyView.hasMany(models.associate, {
      foreignKey: "user_id",
      as: "staff",
    });


    userFamilyView.hasOne(models.associate, {
      foreignKey: "associate",
      as: "associatedTo",
    });

    userFamilyView.belongsTo(models.customer, {
      foreignKey: "parent",
      targetKey: 'customer',
      as: "customeredTo",
    });
    userFamilyView.hasOne(models.professional_detail, {
      foreignKey: "user_id",
      as: "professional_detail",
    });
    userFamilyView.hasOne(models.customer, {
      foreignKey: "customer",
      as: "employedAt",
    });

    userFamilyView.hasMany(models.symptom_analysis, {
      foreignKey: "user_id",
      as: "symptom_analysis",
    });
    userFamilyView.hasMany(models.covid_checker, {
      foreignKey: "user_id",
      as: "covidCheckerResult",
    });

    userFamilyView.hasMany(models.health_advisor, {
      foreignKey: "patient_id",
      sourceKey: 'parent',
      as: "advisors",
    });
    userFamilyView.hasOne(models.health_advisor, {
      foreignKey: "patient_id",
      sourceKey: 'parent',
      as: "advisor",
    });

    userFamilyView.hasMany(models.booking, {
      foreignKey: "patient_id",
      as: "patient_bookings",
    });

    userFamilyView.hasOne(models.bulk_upload_user_error, {
      foreignKey: "patient_id",
      as: "upload_error",
    });

    userFamilyView.hasOne(models.user_config, {
      foreignKey: "user_id",
      as: "config",
    });


    userFamilyView.hasMany(models.userMedicalHistory, {
      foreignKey: "user_id",
      as: "userMedicalHistory",
    });
  };

  /**
   * Support Pagination
   */
  sequelizePaginate.paginate(userFamilyView);

  return userFamilyView;
};

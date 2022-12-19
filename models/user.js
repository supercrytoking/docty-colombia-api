/* eslint-disable eqeqeq */
"use strict";
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const sequelizePaginate = require("sequelize-paginate");

module.exports = (sequelize, DataTypes) => {
    const user = sequelize.define(
        "user", {
        first_name: { type: DataTypes.STRING, trim: true },
        middle_name: { type: DataTypes.STRING, trim: true },
        last_name: { type: DataTypes.STRING, trim: true },
        last_name_2: { type: DataTypes.STRING, trim: true },
        email: { type: DataTypes.STRING, trim: true },
        password: { type: DataTypes.STRING, trim: true },
        national_id: {
            type: DataTypes.STRING,
            trim: true,
            unique: true,
            validate: {
                async isUnique(value) {
                    if (!!value) {
                        let sq = `select id from users where national_id = "${value}" and`;
                        if (!!this.id_proof_type) {
                            sq += ` and id_proof_type = "${this.id_proof_type}"`
                        }
                        if (this.id)
                            sq += ` and id != ${this.id}`
                        let d = await sequelize.query(sq).spread((r, m) => r[0]).catch(e => null);
                        console.log(JSON.stringify(d))
                        if (!!d) throw new Error('SERVER_MESSAGE.DUPLICATE_NATIONAL_ID');
                        return;
                    }
                },
            }
        },
        city_code: DataTypes.STRING,
        phone_number: { type: DataTypes.STRING, trim: true },
        status: { type: DataTypes.INTEGER, defaultValue: 0 },
        status_personal_information: DataTypes.INTEGER,
        device_id: { type: DataTypes.STRING, trim: true },
        device_type: { type: DataTypes.STRING, trim: true },
        website: { type: DataTypes.STRING, trim: true },
        company_name: { type: DataTypes.STRING, trim: true },
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
        signature: { type: DataTypes.STRING, trim: true },
        isAvailableStatus: { type: DataTypes.BOOLEAN, defaultValue: "0" },
        isSigned: DataTypes.BOOLEAN,
        home_delivery: DataTypes.BOOLEAN,
        need_password_reset: { type: DataTypes.BOOLEAN, defaultValue: false },
        expertise_level: {
            type: DataTypes.INTEGER, // 0: general, 1: specialist
            defaultValue: 0,
        },
        first_login: { type: DataTypes.BOOLEAN, defaultValue: true },
        suspend_remarks: DataTypes.TEXT, // this is no use, will remove soon
        is_profile_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
        timezone_offset: { type: DataTypes.INTEGER, defaultValue: 0 },
        id_proof_type: { type: DataTypes.STRING, trim: true },
        id_proof_copy: { type: DataTypes.STRING, trim: true },
        tp: { type: DataTypes.STRING, trim: true },
        telephone_1: { type: DataTypes.STRING, trim: true },
        telephone_2: { type: DataTypes.STRING, trim: true },
        municipality_code: { type: DataTypes.INTEGER, trim: true },
        municipality: { type: DataTypes.STRING, trim: true },
        speciality_type: { type: DataTypes.INTEGER, defaultValue: 1 }, //1: medical specialtiy, 4: non medical specialtiy
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
                    return this.company_name;
                }
                if (!!!this.first_name && !!this.company_name) {
                    return this.company_name;
                }
                let n = `${prefix}${this.first_name || ""}${this.middle_name ? " " + this.middle_name : ""
                    } ${this.last_name || ""}`;
                return n.trim();
            },

        },
        slug: {
            type: DataTypes.VIRTUAL,
            get() {
                if (!!this.company_name) {
                    return (this.company_name.replace(/[^a-zA-Z ]/g, "").replace(/ +/g, '-') + `-${this.id}`).toLocaleLowerCase();

                }
                return null;
            },
        },

        isPasswordSet: {
            type: DataTypes.VIRTUAL,
            get() {
                return !!this.password;
            },
        },
    }, {
        sequelize,
        associations: true,
        charset: "utf8",
        collate: "utf8_unicode_ci",
        paranoid: true,
        underScore: true,
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
                    "speciality_type", 'emergency_contact',
                ],
            },
            availableStatus: {
                attributes: ["isAvailableStatus"],
            },
            idInfo: {
                attributes: [
                    "tp",
                    "national_id",
                    "id_proof_type",
                    "id_proof_copy",
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
                attributes: ['id', 'first_name', 'gender', 'email', 'phone_number', 'last_name', 'middle_name', 'national_id', 'dob', 'overview', 'picture', 'ethnicity_id', 'country_of_birth', 'fullName', 'createdAt', 'isd_code', 'emergency_contact'],
            },
            emergencycontactInfo: {
                attributes: ['id', 'first_name', 'email', 'phone_number', 'last_name', 'middle_name', 'overview', 'picture', 'fullName', 'isd_code', 'emergency_contact']
            },
            timezone: {
                attributes: ["timezone_offset"],
            },
            overview: {
                attributes: ["overview"],
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

    user.associate = function (models) {
        user.hasMany(models.activity_log, {
            foreignKey: {
                name: "user_id",
                fieldName: "user_id",
            },
            as: "activity_log",
        });
        user.hasOne(models.user_role, {
            foreignKey: {
                name: "user_id",
                fieldName: "user_id",
            },
        });
        user.hasOne(models.my_favorite, {
            foreignKey: {
                name: "provider_id",
                fieldName: "provider_id",
            },
            as: "favorites",
        });
        user.hasMany(models.user_kindred, {
            foreignKey: 'user_id',
            as: 'families'
        });
        user.belongsToMany(models.user.scope('familyInfo'), {
            foreignKey: 'user_id',
            otherKey: 'member_id',
            through: models.user_kindred,
            as: 'family'
        });
        user.hasOne(models.user_kindred, {
            foreignKey: 'member_id',
            as: 'rel'
        });

        user.belongsTo(models.user.scope('emergencycontactInfo'), {
            foreignKey: "emergency_contact",
            as: "emergency_contact_person",
        });
        user.hasMany(models.user_practice, {
            foreignKey: "user_id",
            as: "practice",
        });
        user.hasMany(models.user_license, {
            foreignKey: "user_id",
            as: "licence",
        });
        user.hasMany(models.location_open, {
            foreignKey: "user_id",
            as: "location_open",
        });
        user.hasOne(models.user_medical, {
            foreignKey: {
                name: "user_id",
                fieldName: "user_id",
            },
            as: "user_medical",
        });
        user.hasOne(models.address, {
            foreignKey: {
                name: "user_id",
                fieldName: "user_id",
            },
            as: "address",
        });
        user.hasMany(models.user_education, {
            foreignKey: "user_id",
            as: "education",
        });
        user.hasOne(models.user_insurance, {
            foreignKey: "user_id",
            as: "insurance",
            where: { member_id: 0 },
        });
        user.hasMany(models.user_insurance, {
            foreignKey: "user_id",
            as: "insurances",
            where: { member_id: 0 },
        });
        user.belongsToMany(models.insurence_provider, {
            foreignKey: "user_id",
            through: 'user_insurance',
            otherKey: 'company',
            as: "insurance_provider",
            // where: { member_id: 0 },
        });
        user.hasMany(models.insurance_associate, {
            foreignKey: "user_id",
            as: "insurance_associates",
        });
        user.hasMany(models.user_charge, {
            foreignKey: "user_id",
            as: "charges",
        });
        user.hasMany(models.user_availability, {
            foreignKey: "user_id",
            as: "availability",
        });
        user.belongsTo(models.country, {
            foreignKey: "country_id",
            as: "country",
        });
        user.belongsTo(models.state, {
            foreignKey: "state_id",
            as: "state",
        });
        // user.belongsTo(models.city, {
        //   foreignKey: 'city_id',
        //   as: 'city'
        // });
        user.hasOne(models.address, {
            foreignKey: "user_id",
            as: "user_address",
            where: { family_id: 0 },
        });
        user.hasMany(models.location, {
            foreignKey: "user_id",
            as: "user_location",
        });
        user.hasMany(models.my_favorite, {
            foreignKey: "provider_id",
            targetKey: "id",
            as: "favorite_of",
        });
        user.hasMany(models.user_service, {
            foreignKey: "user_id",
            as: "services",
        });
        user.hasOne(models.signedContract, {
            foreignKey: "user_id",
            as: "contract",
            where: {
                status: 1,
                end: {
                    [Op.or]: [{
                        [Op.eq]: null
                    }, {
                        [Op.gt]: new Date()
                    }]
                },
            },
        });
        user.hasMany(models.user_document, {
            foreignKey: "user_id",
            as: "documents",
        });
        user.hasOne(models.user_medical_condition, {
            foreignKey: "user_id",
            as: "medical_conditions",
        });
        user.hasMany(models.user_skill, {
            foreignKey: "user_id",
            as: "skills",
        });
        user.hasMany(models.user_speciality, {
            foreignKey: "user_id",
            as: "user_speciality",
        });
        user.hasMany(models.user_department, {
            foreignKey: "user_id",
            as: "user_department",
        });

        // return staff list
        user.hasMany(models.associate, {
            foreignKey: "user_id",
            as: "staff",
        });

        user.hasMany(models.associate, {
            foreignKey: "associate",
            as: "associate",
        });
        user.hasOne(models.associate, {
            foreignKey: "associate",
            as: "associatedTo",
        });
        user.hasMany(models.customer, {
            foreignKey: "customer",
            as: "customer",
        });
        user.hasOne(models.customer, {
            foreignKey: "customer",
            as: "customeredTo",
        });
        user.hasOne(models.professional_detail, {
            foreignKey: "user_id",
            as: "professional_detail",
        });
        user.hasOne(models.customer, {
            foreignKey: "customer",
            as: "employedAt",
        });
        user.hasOne(models.rating_summary, {
            foreignKey: "user_id",
            as: "rating_summary",
        });
        user.hasMany(models.schedule, {
            foreignKey: "user_id",
            as: "schedule",
        });
        user.hasOne(models.user_profile_reviewer, {
            foreignKey: "user_id",
            as: "reviewer",
        });
        user.hasMany(models.symptom_analysis, {
            foreignKey: "user_id",
            as: "symptom_analysis",
        });
        user.hasMany(models.covid_checker, {
            foreignKey: "user_id",
            as: "covidCheckerResult",
        });

        user.hasMany(models.offer, {
            foreignKey: "user_id",
            as: "offer",
        });
        user.hasMany(models.company_service, {
            foreignKey: "user_id",
            as: "company_service",
        });
        user.hasMany(models.health_advisor, {
            foreignKey: "patient_id",
            as: "advisors",
        });

        user.hasMany(models.booking, {
            foreignKey: "provider_id",
            as: "provider_bookings",
        });

        user.hasMany(models.booking, {
            foreignKey: "patient_id",
            as: "patient_bookings",
        });

        user.hasOne(models.bulk_upload_user_error, {
            foreignKey: "patient_id",
            as: "upload_error",
        });

        user.hasOne(models.user_config, {
            foreignKey: "user_id",
            as: "config",
        });
        user.belongsToMany(models.user, {
            foreignKey: "clinic_id",
            through: 'clinic_pharmacy',
            otherKey: 'pharmacy_id',
            as: "pharmacies",
        });
        user.belongsToMany(models.user, {
            foreignKey: "pharmacy_id",
            through: 'clinic_pharmacy',
            otherKey: 'clinic_id',
            as: "clinics",
        });
        user.hasMany(models.clinic_pharmacy, {
            foreignKey: "clinic_id",
            as: "clinic_pharmacy",
        });
        user.hasMany(models.clinic_pharmacy, {
            foreignKey: "pharmacy_id",
            as: "pharmacy_clinic",
        });
        user.hasMany(models.userMedicalHistory, {
            foreignKey: "user_id",
            as: "userMedicalHistory",
        });
        user.belongsToMany(models.speciality, {
            foreignKey: "user_id",
            otherKey: "speciality_id",
            through: 'user_services',
            as: "specialities"
        });
        user.belongsToMany(models.company_service, {
            foreignKey: "associate",
            otherKey: "user_id",
            targetKey: "user_id",
            through: 'associates',
            as: "networkProviders"
        });
        user.hasOne(models.family_access, {
            foreignKey: "permitted_to",
            as: "permissions"
        });
        user.hasOne(models.family_access, {
            foreignKey: "user_id",
            as: "permitted"
        });
    };

    /**
     * Support Pagination
     */
    sequelizePaginate.paginate(user);

    return user;
};
/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
var generator = require("generate-password");
const bcrypt = require("bcryptjs");
// const { Parser, parse } = require("json2csv");
const {
  sendEmail,
  upload,
  getAge,
  validateEmail,
  isMatchBloodGroup,
  isFinitValue,
  isValidMobileNumber,
  isValidDob,
  isValidGender,
  isValidName,
  ExcelDateToJSDate,
} = require("../commons/helper");
const { queueEmail } = require("../commons/jobs");
const { getLimitOffset } = require("../commons/paginator");
const { response, errorResponse } = require("../commons/response");
const { getFullAge } = require("../commons/fullAge");
const db = require("../models");
const { getEmailTemplate } = require("../commons/getEmailTemplate");
const { crmTrigger, otpTrigger } = require("../commons/crmTrigger");
const { smsTrigger, smsOtpTrigger } = require("../commons/smsCrmTrigger");
const { serverMessage } = require("../commons/serverMessage");
const { requestAdvisory } = require("../clinic/controllers/advisoryAccess");
var xlsx = require("node-xlsx");
var fs = require("fs");
const csv = require("csvtojson");
var parser = require('simple-excel-to-json');
const { syncCorporateCustomer } = require("../commons/clinicCustomer");
function getNewPassword() {
  return new Promise((resolve, reject) => {
    var password = generator.generate({ length: 10, numbers: true });
    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        reject(err);
        return;
      }
      bcrypt.hash(password, salt, function (err, hashPassword) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ hashPassword: hashPassword, password: password });
      });
    });
  });
}

function getCountry(countries, name) {
  let n = (name || "").toUpperCase();
  let ct = countries.find((e) => (e.name || "").toUpperCase() == n);
  return ct || {};
}

function idType(idTypes, name) {
  let n = (name || "").toUpperCase();
  let ct = idTypes.find(
    (e) => (e.es || "").toUpperCase() == n || (e.en || "").toUpperCase() == n
  );
  let cts = ct || {};
  return cts.keyword || n;
}

function validateUserObject(inst) {
  let error = {
    first_name: isValidName(inst.first_name),
    middle_name: isValidName(inst.middle_name),
    last_name: isValidName(inst.last_name),
    gender: isValidGender(inst.gender),
    email: validateEmail(inst.email),
    phone_number: isValidMobileNumber(inst.phone_number),
    height: isFinitValue(inst.height),
    weight: isFinitValue(inst.height),
    dob: isValidDob(inst.dob),
    blood_group: isMatchBloodGroup(inst.blood_group),
  };
  let status = Object.values(error).every((val) => val == true);
  return { error, status };
}

function calcBmi(w, h) {
  if (!!!w || !!!h) return 0;
  let ww = parseInt(w) || 0;
  let hh = parseInt(h) || 0;
  hh = hh / 100;
  return ww / (hh * hh);
}

async function sendBulkUserEmail(req, user, pwdObj) {
  const otp = Math.floor(100000 + Math.random() * 900000);
  let trigger = "Provider_Patient_Added";
  let trigger1 = "New_Patient_Added";
  if (req.user.role == 13) {
    trigger = "Corporate_Employee_Welcome";
    trigger1 = "Corporate_New_Employee_Added";
  }
  let age = getAge(user.dob);
  let p = [];
  if (age >= 18) {
    p.push(
      await crmTrigger(
        trigger,
        {
          email: user.email,
          clinic_id: req.user.if,
          user_id: user.email,
          password: pwdObj.password,
          invited_by: req.user.company_name,
          user_name: `${user.first_name} ${user.middle_name} ${user.last_name}`,
        },
        req.lang
      )
    );
    var isd_code = user.isd_code || "57";
    p.push(
      smsOtpTrigger(
        "Clinic_Patient_Welcome_SMS",
        {
          name: user.first_name,
          password: pwdObj.password,
          email: user.email,
          to: isd_code + user.phone_number,
        },
        req.lang || req.lang
      )
    );
  }
  p.push(
    crmTrigger(
      trigger1,
      {
        email: req.user.email,
        patient_name: `${user.first_name} ${user.middle_name} ${user.last_name}`,
        patient_email: req.user.email,
      },
      req.lang
    )
  );
  return p;
}

module.exports = {
  bulkAdd: async (req, res, next) => {
    try {
      let totalRows = 0;
      let successCount = 0;
      let invalidCount = 0;
      let duplicateCount = 0;
      let userId = req.user.id;

      if (req.file == null) {
        return res.status(400).send({
          status: false,
          errors: `require file`,
        });
      }
      var excel_path = req.file.path;

      if (!excel_path.endsWith("xlsx") && !excel_path.endsWith("csv")) {
        return res.status(400).send({
          status: false,
          errors: `Unsupported file format, must xlsx, csv file`,
        });
      }
      var obj = //xlsx.parse(excel_path);
        parser.parseXls2Json(excel_path)
      if (obj.length == 0) {
        return res.status(400).send({
          status: false,
          errors: `Cannot parse xlsx`,
        });
      }
      let limit = 500;
      let cred = await db.credential.findOne({ where: { key: 'BULK_UPLOAD_ROW_LIMIT' } });
      if (!!cred && !!cred.value) {
        limit = parseInt(cred.value);
      }
      if (isNaN(limit) || !!!limit) limit = 500;
      let data = obj[0] || [];
      // if (data.length > limit) {
      //   console.log(data.length)
      //   let msg = serverMessage('SERVER_MESSAGE.BULK_UPLOAD_ROW_LIMIT_EXCEED ', (req.lang || 'es'));
      //   msg = msg.replace('${limit}', limit);
      //   return res.status(400).send({
      //     status: false,
      //     message: msg,
      //     errors: msg,
      //     error: msg
      //   });
      // }

      var pwdObj = await getNewPassword();
      let idTypes = [];
      let countries = [];
      let idTyp = await db.translation.findAll({
        where: { section: "ID_CARD_TYPE" },
      });
      if (!!idTyp) {
        idTypes = JSON.parse(JSON.stringify(idTyp));
      }

      let ctss = await db.country.findAll();
      if (!!ctss) {
        countries = JSON.parse(JSON.stringify(ctss));
      }
      let dob18 = new Date((new Date().getFullYear() - 18), 0, 1)
      let promises = [];
      for (let row of data) {
        if (!!row.First_Name) {
          totalRows++;
          var country_id = 47;
          var country_of_birth = null;
          var isd_code = "57";
          if (row.Country) {
            var country = getCountry(countries, row.Country);
            if (country) {
              country_id = country.id;
              isd_code = country.phonecode || "57";
            } else {
              country_id = 47;
              isd_code = 57;
            }
          }
          if (row.Country_Born) {
            var country2 = getCountry(countries, row.Country_Born);
            if (country2) country_of_birth = country2.id;
          }
          let inst = {
            first_name: row.First_Name,
            middle_name: row.Second_Name,
            last_name: row.Last_Name,
            last_name_2: row.Second_Last_Name,
            id_proof_type: idType(idTypes, row.ID_Type),
            national_id: !!row.ID_Number ? row.ID_Number : null,
            dob: ExcelDateToJSDate(row.DOB) || dob18,
            gender: (row.Gender || "").toUpperCase(),
            ips_code: row.IPS_Code,
            address: row.Address,
            city_code: row.City_Code,
            country_id: country_id,
            country_of_birth: country_of_birth,
            phone_number: row.Mobile_Number,
            telephone_1: row.Telephone_No_2,
            telephone_2: row.Telephone_No_3,
            email: row.Email || null,
            municipality: row.Municipality || null,
            municipality_code: row.Municipality_Code || null,
            isd_code: isd_code,
            lang: "es",
            status: 1
          };

          inst.address = { address: inst.address };
          inst.userMedicalHistory = [];
          if (!!row.Sistolic || !!row.Diastolic) {
            inst.userMedicalHistory.push(
              {
                class: 'blood_pressure',
                response: { "systolic": row.Sistolic, "dystolic": row.Diastolic, "heart_rate": null },
                dated: new Date(),
                added_by: req.user.id
              }
            )
          }
          if (!!row.HTA_Dx && (row.HTA_Dx.toUpperCase() == 'SI' || row.HTA_Dx.toUpperCase() == 'YES')) {
            inst.userMedicalHistory.push(
              {
                class: 'cronic_condition',
                response: { "cronic_condition": "HYPERTENSION", "taking_medicine": false },
                dated: new Date(),
                added_by: req.user.id
              }
            )
          }
          if (!!row.Diabetes_Dx && (row.Diabetes_Dx.toUpperCase() == 'SI' || row.Diabetes_Dx.toUpperCase() == 'YES')) {
            inst.userMedicalHistory.push(
              {
                class: 'cronic_condition',
                response: { "cronic_condition": "DIABETES", "taking_medicine": false },
                dated: new Date(),
                added_by: req.user.id
              }
            )
          }
          if (!!row.EPOC && (row.EPOC.toUpperCase() == 'SI' || row.EPOC.toUpperCase() == 'YES')) {
            inst.userMedicalHistory.push(
              {
                class: 'cronic_condition',
                response: { "cronic_condition": 'COPD', "taking_medicine": false },
                dated: new Date(),
                added_by: req.user.id
              }
            )
          }
          // inst.medical_conditions = { response: response };
          let policy = null;
          if (!!row.Insurance_Provider_Code || !!row.Insurance_Code) {
            policy = {
              company: row.Insurance_Provider_Code,
              card_number: row.Insurance_Code,
              type: (row.Insurance_Type || 'individual').toLowerCase(),
              start_date: ExcelDateToJSDate(row.Policy_Starts), end_date: ExcelDateToJSDate(row.Policy_Ends),
              // member_id: 0,
              addedBy: req.user.id
            }
            if (policy.type == 'group') {
              policy.members = [
                {
                  member_id: 0,
                  isCovered: true,
                  isPrimary: (row.Insurance_Holder || '').toUpperCase() == 'YES' || (row.Insurance_Holder || '').toUpperCase() == 'SI',
                  policy_number: row.Insurance_Code
                }
              ]
            }
          }
          if (!!!row.User_Type || (row.User_Type || '').toUpperCase() == 'PRIMARY') {
            if (!!policy)
              inst.insurances = [policy];
            let validate = validateUserObject(inst);
            inst.validate = validate;
            if (validate.status) {
              inst.password = pwdObj.hashPassword;
              inst.need_password_reset = true;
              inst.email_verified = true;
              inst.status = true;
            } else {
              inst.status = false;
            }
            inst.user_medical = {
              height: row.Height || 0,
              weight: row.Weight || 0,
              weight_unit: "kg",
              bmi: calcBmi(row.Weight, row.Height),
              height_unit: "cm",
              waist: row.Waist_Perimeter || 0,
              waist_unit: 'cm',
              change_by: req.user.id
            };
            inst.user_role = { role_id: 2 };
            inst.customeredTo = { user_id: req.user.id, ips_code: inst.ips_code };
            console.log(inst)

          } else {
            inst.relation = (row.Relationship || '').toUpperCase();
            inst.family_medical = {
              height: row.Height || 0,
              weight: row.Weight || 0,
              weight_unit: "kg",
              height_unit: "cm",
              waist: row.Waist_Perimeter || 0,
              bmi: calcBmi(row.Weight, row.Height),
              waist_unit: 'cm',
              change_by: req.user.id
            };
            let ln = promises.length;
            if (!!ln) {
              if (!!policy && policy.type == 'individual') {
                inst.insurances = [policy];
              } else {
                inst.groupInsurances = [{
                  isCovered: true,
                  isPrimary: (row.Insurance_Holder || '').toUpperCase() == 'YES' || (row.Insurance_Holder || '').toUpperCase() == 'SI',
                  policy_number: row.Insurance_Code
                }]
              }
              promises[ln - 1].family = promises[ln - 1].family || [];
              promises[ln - 1].family.push(inst)
            }
          }
          promises.push(inst)
        }
      }

      let rPromises = [];
      // return res.send(promises)
      for (let e of promises) {
        var where = {};
        let arr = []
        if (!!e.phone_number) {
          // var where = {
          //   phone_number: e.phone_number,
          // };
          arr.push(
            { phone_number: e.phone_number },
          )
        }
        if (!!e.email) {
          // where = {
          //   email: e.email,
          // };
          arr.push(
            { email: e.email },
          )
        }
        if (!!e.national_id) {
          arr.push(
            { national_id: e.national_id },
          )
        }
        let existingUser = null;

        if (!!arr.length) {
          where = {
            [Op.or]: arr,
          };
          existingUser = await db.user.findOne({
            where: where,
          });
        }

        if (!!!existingUser || !!!existingUser.id) {
          rPromises.push(
            db.user.create(e, {
              include: [
                "user_role",
                "user_medical",
                "customeredTo",
                "address",
                'userMedicalHistory',
                {
                  model: db.user_insurance,
                  as: "insurances",
                  include: ['members']
                },
              ],
            }).then(async (user) => {
              if (user && req.user.role == 5) {
                await requestAdvisory({
                  patient_id: user.id,
                  clinic_id: userId,
                  approved: 1, isDefault: true
                });
              }
              if (user && req.user.role == 13) {
                await syncCorporateCustomer({ patientId: user.id, corporate_id: req.user.id })
              }
              if (!!e.status) {
                successCount += (1 + (e.family || []).length);
              } else {
                invalidCount += (1 + (e.family || []).length);
                await rPromises.push(
                  db.bulk_upload_user_error.create({
                    clinic_id: req.user.id,
                    patient_id: user.id,
                    errors: e.validate.error,
                  })
                );
              }
              return user;
            })
          )
        } else {
          duplicateCount += (1 + (e.family || []).length);
          rPromises.push(
            db.customer.findOrCreate({ where: { user_id: req.user.id, customer: existingUser.id } }).then(() => {

              if (user && req.user.role == 5) {
                return db.health_advisor
                  .findOrCreate({
                    where: {
                      patient_id: existingUser.id,
                      clinic_id: req.user.id
                    },
                    paranoid: false,
                  })
              }
            })
          );
        }
      }

      Promise.all(rPromises).
        then(async () => {
          return new Promise(re => {
            setTimeout(() => {
              re(true)
            }, 1000)
          })
        })
        .then(async () => {
          return await db.sequelize.query(`UPDATE addresses a, user_families uf SET a.user_id = uf.user_id WHERE a.user_id IS NULL AND a.family_id = uf.id`).then(() => {
            return db.sequelize.query(`UPDATE family_medicals fm, user_families uf SET fm.user_id = uf.user_id WHERE fm.user_id IS NULL AND fm.family_id = uf.id`);
          }).then(() => {
            return db.sequelize.query(`UPDATE user_medical_histories umh, user_families uf SET umh.user_id = uf.user_id WHERE umh.user_id IS NULL AND umh.family_id = uf.id`);
          }).then(() => {
            return db.sequelize.query(`UPDATE user_insurances ui, user_families uf SET ui.user_id = uf.user_id WHERE ui.user_id IS NULL AND ui.member_id = uf.id`);
          }).then(() => {
            return db.sequelize.query(`UPDATE user_insurance_members uim, user_insurances ui SET uim.user_id = ui.user_id,uim.insurance_id = ui.id WHERE ui.card_number = uim.policy_number AND (uim.user_id IS NULL OR uim.insurance_id IS NULL)`)
          }).then(() => {
            return db.sequelize.query(`UPDATE user_insurance_members uim SET uim.member_id = uim.user_id WHERE uim.member_id = 0`)
          })
            .catch(e => console.log(e))
        })
        .then((resp) => {
          res.send({
            status: true,
            totalRows,
            successCount,
            duplicateCount,
            invalidCount,
            data: promises
          });
        })
        .catch((r) => {
          console.log(r)
          errorResponse(res, r);
        });
    } catch (err) {
      console.log(err);
      errorResponse(res, err);
    }
  },

  add: async (req, res, next) => {
    if (req.user && req.user.id) {
      var data = req.body;
      data.email_verified = true;
      data.status = 1;

      try {
        if (data.id) {
          db.user
            .update(data, { where: { id: data.id } })
            .then(async (resp) => {
              await db.customer.update(
                { location_id: data.location_id },
                {
                  where: { user_id: req.user.id, customer: data.id },
                }
              );
              let ct = await db.customer.findOrCreate({
                where: {
                  user_id: req.user.id,
                  customer: data.id,
                },
              });
              await ct[0].update({
                location_id: data.location_id,
                ips_code: data.ips_code,
              });
              await db.bulk_upload_user_error.destroy({
                where: { patient_id: data.id },
              });
              res.send({ resp, ct: ct[0] });
            })
            .catch((err) => {
              res.status(400).send({
                status: false,
                errors: `${err}`,
              });
            });
          return;
        }
        var user = null;
        if (!!data.email)
          user = await db.user.findOne({ where: { email: data.email } });
        if (user) {
          throw "EMAIL_UNAVALABLE";
        }
        user = await db.user.findOne({
          where: { phone_number: data.phone_number },
        });
        if (user) {
          throw "PHONE_UNAVALABLE";
        }
        var pwdObj = await getNewPassword();
        data.password = pwdObj.hashPassword;
        data.need_password_reset = true;

        return db.user
          .create(data)
          .then(async (userObj) => {
            var clinic = await db.user.findOne({ where: { id: req.user.id } });
            let trigger = "Provider_Patient_Added";
            let trigger1 = "New_Patient_Added";
            if (req.user.role && req.user.role == 13) {
              trigger = "Corporate_Employee_Welcome";
              trigger1 = "Corporate_New_Employee_Added";
              let d = {
                company: clinic.company_name,
                user_id: userObj.id,
                company_id: req.user.id,
                added_by: 1,
              };
              await db.professional_detail.create(d);
            }

            crmTrigger(
              trigger,
              {
                email: data.email,
                user_id: data.email,
                clinic_id: req.user.id,
                password: pwdObj.password,
                invited_by: clinic.company_name,
                user_name: `${data.first_name} ${data.last_name}`,
              },
              req.lang
            );
            crmTrigger(
              trigger1,
              {
                email: clinic.email,
                patient_name: data.first_name + " " + data.last_name,
                patient_email: data.email,
              },
              clinic.lang || req.lang
            );
            if (req.user.role == 5) {
              await requestAdvisory({
                patient_id: userObj.id,
                clinic_id: req.user.id,
                approved: 1,
                isDefault: true
              });
            }
            await db.user_role.create({ user_id: userObj.id, role_id: 2 }); // patient

            return await db.customer
              .create({
                user_id: req.user.id,
                customer: userObj.id,
                location_id: data.location_id,
                ips_code: data.ips_code, family_access: true
              })
              .then(async () => {
                if (req.user.role && req.user.role == 13) {
                  await syncCorporateCustomer({ patientId: userObj.id, corporate_id: req.user.id });
                }
                res.send(userObj);
              })
              .catch((err) => {
                res.status(400).send({
                  status: false,
                  errors: `${err}`,
                });
              });
          })
          .catch((err) => {
            res.status(400).send({
              status: false,
              errors: `${err}`,
            });
          });
      } catch (err) {
        res.status(400).send({
          status: false,
          errors: `${err}`,
        });
      }
    } else {
      res.sendStatus(406);
    }
  },
  mycustomers: async (req, res, next) => {
    if (req.user && req.user.id) {
      let where = {};

      if (req.query && req.query.id) where.id = req.query.id;

      db.userFamilyView
        .findAll({
          where: where,
          include: [
            {
              model: db.customer.scope(""),
              as: "customeredTo",
              where: { user_id: req.user.id },
              include: [
                {
                  model: db.location,
                  //    required: false,
                  as: "location_info",
                },
              ],
            },
            {
              model: db.user_medical,
              as: "user_medical",
            },
            {
              model: db.symptom_analysis,
              as: "symptom_analysis",
              separate: true,
              limit: 1,
              order: [["id", "DESC"]],
              include: ["changed_admin", "changed_user"],
            },
            {
              model: db.covid_checker,
              as: "covidCheckerResult",
              separate: true,
              limit: 1,
              order: [["id", "DESC"]],
              // include: [
              //   'changed_admin', 'changed_user'
              // ],
            },
            {
              model: db.professional_detail, as: 'professional_detail',
              include: ['user_designation']
            }
          ],
        })
        .then((resp) => {
          res.send(resp);
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            errors: `${err}`,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  mycustomersEx: async (req, res, next) => {
    if (req.user && req.user.id) {
      let params = req.params;
      let search = "";
      let page = 1;
      let orderKey = "createdAt";
      let order = "desc";
      let pageSize = 25;
      let where = { status: true };

      if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
      }
      if (req.query && req.query.id) where.id = req.query.id;
      if (search.length > 0) {
        where = {
          ...where,
          [Op.or]: [
            { "$customer.user_id$": req.user.id },
            { "$advisors.clinic_id$": req.user.id },
          ],
          [Op.or]: [
            { first_name: { [Op.like]: `%${search}%` } },
            { last_name: { [Op.like]: `%${search}%` } },
            { middle_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone_number: { [Op.like]: `%${search}%` } },
          ],
        };
      }

      let include = [
        {
          model: db.customer.scope(""),
          attributes: ["customer", "user_id"],
          as: "customer",
          where: { user_id: req.user.id },
        },
        {
          model: db.health_advisor,
          attributes: ["patient_id", "clinic_id"],
          as: "advisors",
          where: { clinic_id: req.user.id },
        },
        {
          model: db.symptom_analysis,
          as: "symptom_analysis",
          separate: true,
          limit: 1,
          // family_id: 0,
          order: [["id", "DESC"]],
          include: ["changed_admin", "changed_user"],
        },
        {
          model: db.covid_checker,
          as: "covidCheckerResult",
          separate: true,
          limit: 1,
          order: [["id", "DESC"]],
          include: [
            // 'changed_admin', 'changed_user'
          ],
        },
        "user_medical",
        "medical_conditions",
        {
          model: db.activity_log,
          as: "activity_log",
          limit: 1,
          order: [["createdAt", "DESC"]],
          required: false,
          attributes: ["createdAt", "data"],
          where: {
            type: { [Op.like]: "Login" },
          },
        },
      ];
      let attInc = [];
      if (params && params.type && params.type == "uploadErrors") {
        include.push({
          model: db.bulk_upload_user_error,
          as: "upload_error",
          attributes: [],
          where: { clinic_id: req.user.id },
          require: true,
        });
        attInc = [[db.sequelize.col("upload_error.errors"), "errors"]];
        where.status = false;
      }
      if (
        req.user &&
        req.user.role == 5 &&
        !(params.type && params.type == "uploadErrors")
      ) {
        let OneYearAgo = new Date(
          new Date().setFullYear(new Date().getFullYear() - 1)
        );
        include.push({
          model: db.booking,
          as: "patient_bookings",
          separate: true,
          require: false,
          where: {
            createdAt: {
              [Op.gte]: OneYearAgo,
            },
          },
          attributes: [
            "id",
            [Sequelize.fn("COUNT", "patient_bookings.id"), "bookings_in_year"],
          ],
          group: ["patient_id"],
        });
        // attInc.push(
        //   [Sequelize.fn("COUNT", 'patient_bookings.id'), "bookings_in_year"]
        // );
      }
      db.user
        .scope("minimalInfo", "contactInfo")
        .findAndCountAll({
          order: [[orderKey, order]],
          limit: getLimitOffset(page, pageSize),
          attributes: [
            ...attInc,
            "first_name",
            "last_name",
            "middle_name",
            "gender",
            "dob",
            "company_name",
            "picture",
            "id",
            "fullName",
            "isd_code",
            "phone_number",
            "email",
            "createdAt",
          ],
          where: where,
          include,
        })
        .then((resp) => {
          return response(res, resp);
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            errors: `${err}`,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  remove: async (req, res, next) => {
    db.customer
      .destroy({
        where: {
          customer: req.params.id,
          user_id: req.user.id,
        },
      })
      .then((resp) => response(res, {}, "success"))
      .catch((e) => errorResponse(res, e));
  },
  failedUploadCsvData: async (req, res, next) => {
    try {
      let search = "";
      let page = 1;
      let orderKey = "createdAt";
      let order = "desc";
      let pageSize = 25;
      let where = {};

      if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
      }
      if (req.query && req.query.id) where.id = req.query.id;
      if (search.length > 0) {
        where = {
          ...where,
          [Op.or]: [
            { first_name: { [Op.like]: `%${search}%` } },
            { last_name: { [Op.like]: `%${search}%` } },
            { middle_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone_number: { [Op.like]: `%${search}%` } },
          ],
        };
      }
      db.user_inActive
        .findAndCountAll({
          order: [[orderKey, order]],
          limit: getLimitOffset(page, pageSize),
          where: where,
        })
        .then((resp) => {
          return response(res, resp);
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            errors: `${err}`,
          });
        });
    } catch (err) {
      console.log(err);
    }
  },
  mycustomer: async (req, res, next) => {
    if (req.user && req.user.id) {
      var where = { id: req.params.id };
      if (req.query && req.query.id) where.id = req.query.id;
      db.user
        .findOne({
          where: where,
          include: [
            {
              model: db.customer.scope(""),
              as: "employedAt",
              attributes: ["id", "location_id"],
              where: {
                customer: where.id,
                user_id: req.user.id,
              },
            },
            {
              model: db.user_medical,
              as: "user_medical",
            },
          ],
        })
        .then((resp) => {
          return response(res, resp);
        })
        .catch((err) => {
          return errorResponse(res, err);
        });
    } else {
      res.sendStatus(406);
    }
  },
  deleteCustomer: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      db.customer
        .destroy({ where: { user_id: req.user.id, customer: data.id } })
        .then(async (resp) => {
          await db.health_advisor.destroy({ where: { clinic_id: req.user.id, patient_id: data.id } });
          res.send({
            status: true,
            message: "removed successfuly",
          });
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            errors: "Errors",
            data: err,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  // normal(docty) patient -> clinic
  moveDoctyPatientToClinic: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      var clinic_id = data.clinic_id || req.user.id;
      var clinic = await db.user.findByPk(clinic_id);
      var patient = await db.user.findByPk(data.user_id);
      db.customer
        .create({ user_id: clinic_id, customer: data.user_id })
        .then((resp) => {
          crmTrigger(
            "Clinic_Invited_You",
            {
              email: patient.email,
              clinic_id: req.user.id,
              invited_by: clinic.company_name,
              company_name: clinic.company_name,
              user_name: patient.fullName,
              organization_logo: clinic.picture,
              description: data.description,
            },
            patient.lang || req.lang
          );
          crmTrigger(
            "New_Patient_Added",
            { email: clinic.email, patient_name: patient.fullName },
            clinic.lang || req.lang
          );
          res.send({
            status: true,
            data: resp,
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(400).send({
            status: false,
            errors: "Errors",
            data: err,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  downloadCSV: async (req, res) => {
    db.queue.create({
      type: "downloadPatientListOfClinic",
      status: 0, attempt: 0,
      job: JSON.stringify({
        user_id: req.user.id,
        email: req.user.email,
        userName: req.user.company_name,
        subject: "Patient list csv",
        emailTrigger: 'downloadPatientListOfClinic',
        lang: (req.lang || 'es')
      })
    }).then(resp => {
      res.send({
        status: true,
        message: serverMessage('SERVER_MESSAGE.DOWNLOAD_QUEUED', (req.lang || 'es'))
      });
    }).catch(e => {
      res.status(400).send({
        status: false,
        error: `${e}`,
        errors: e,
        message: serverMessage('SERVER_MESSAGE.SONTHING_WRONG', (req.lang || 'es'))
      });
    });

  },
};

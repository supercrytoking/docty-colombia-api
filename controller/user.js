/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models");
const bcrypt = require("bcryptjs");
const validateRegisterInput = require("../validation/register");
const validateLoginInput = require("../validation/login");
const {
  generateToken,
  findSuccessManager,
  getClinicOfUser,
} = require("../commons/helper");
const userInfoValidation = require("../validation/user-info");
const { upload } = require("../commons/fileupload");
const { S3UploadBase64 } = require("../commons/helper");
const { addActivityLog } = require("./activityLog");
const { crmTrigger, otpTrigger } = require("../commons/crmTrigger");
const { smsTrigger } = require("../commons/smsCrmTrigger");
const { getLimitOffset, limit } = require("../commons/paginator");
const { updateOrgContacts } = require("./profile");
const { createCustomer } = require("../commons/clinicCustomer");

const config = require(__dirname + "/../config/config.json");


async function userRegistration(req, res, next) {
  const { errors, isValid } = validateRegisterInput.validateRegisterInput(
    req.body
  );
  let lang = req.lang || "en";
  var isGuest = req.body.isGuest;
  if (!isValid) {
    return res.status(400).json({
      error_code: 101,
      status: false,
      errors: errors,
    });
  } else {
    try {
      var user = await db.user.findOne({
        where: {
          email_verified: 1,
          [Op.or]: [
            {
              email: req.body.email,
            },
            {
              phone_number: req.body.phone_number,
            },
          ],
        },
      });
      if (user) {
        if (user.email == req.body.email) {
          return res.status(409).json({
            error_code: 102,
            status: false,
            errors: "SERVER_MESSAGE.EMAIL_UNAVALABLE",
            // data: user
          });
        }
        if (user.phone_number == req.body.phone_number) {
          return res.status(409).json({
            error_code: 103,
            status: false,
            errors: "SERVER_MESSAGE.PHONE_UNAVALABLE",
          });
        }
      }
      //check otp
      if (!!req.body.otp) {
        let sqlo = `SELECT * FROM pins_phones WHERE pin = ${req.body.otp} AND phone_number LIKE "%${req.body.phone_number}%"
                    AND status = 1 AND updatedAt > NOW() + INTERVAL -30 MINUTE`;
        let o = await db.sequelize.query(sqlo).spread((r, m) => r[0]);
        if (!!!o) {
          return res.status(403).send({
            status: false, message: 'Miss matched phone number and OTP'
          })
        }
      }
      req.body.status = 0;

      bcrypt.genSalt(10, async function (err, salt) {
        bcrypt.hash(req.body.password, salt, async function (err, hash) {
          if (err) throw err;
          req.body.password = hash;
          let data = req.body;
          // added email auto verified
          data.email_verified = true;
          if (req.body.role == 2) {
            data.status = 1;
          }
          var role_id = req.body.role;

          delete req.body.role_id;
          let u = await db.user.findOrCreate({
            where: {
              email: data.email,
            },
          });
          var result = u[0];
          if (!!!data.national_id) data.national_id = null;
          await result.update(data).catch(e => null);
          if (result) {
            var role_data = await db.user_role.findOrCreate({
              where: {
                user_id: result.id,
                role_id: role_id,
              },
            });
            if (!!req.body.clinic) {
              await createCustomer({ patientId: result.id, clinicId: null, slug: req.body.clinic });
            }
            // role_data[0].update({ role_id: role_id });
            const otp = Math.floor(100000 + Math.random() * 900000);
            let responce = await db.pin.create({
              user_id: result.id,
              pin: otp,
              status: 0,
            });
            let trigger = "OTP";
            if (role_id == 1) trigger = "New_Doctor_Signup";
            if (role_id == 2) trigger = "New_Patient_Signup";
            if (role_id == 3) trigger = "New_Nurse_Signup";
            if (role_id == 4) trigger = "New_Lab_Signup";
            if (role_id == 5) trigger = "New_Retail_Clinic_Signup";
            if (role_id == 6) trigger = "New_Pharmacy_Signup";

            try {
              smsTrigger(
                "New_Signup",
                {
                  name: req.body.first_name,
                  otp: otp,
                  to: req.body.isd_code + req.body.phone_number,
                },
                req.lang,
                0
              );
            } catch (e) {
              console.log(e);
            }
            // otpTrigger(trigger, {
            //   email: req.body.email,
            //   subject: 'Docty Health Care: One Time Password',
            //   userName: req.body.company_name || req.body.first_name,
            //   organization_name: req.body.company_name,
            //   otp: otp,
            //   text: `Please use this OTP for your account verification.`
            // }, req.lang);

            try {
              // ignore patient
              if (role_id != 2) {
                var admin = await findSuccessManager();
                if (admin && admin.id) {
                  await db.user_profile_reviewer.upsert({
                    user_id: res.id,
                    admin_id: admin.id,
                  });
                }
              }
            } catch (e) {
              console.log(e);
            }

            addActivityLog({
              user_id: result.id,
              type: "New Signup",
              details: `User ${result.email} is registered`,
            });
            var user = {};
            if (isGuest) {
              const hash = await generateToken({ name: req.body.first_name, group: 'client', role: role_id });
              await db.token.create({
                userId: result.id,
                token: hash,
                expired_at: null,
                login_as: 0,
              });
              res.set("auth-token", hash);
              var user = JSON.parse(JSON.stringify(result));
            }

            res.status(200).send({
              error: false,
              status: "Success",
              message: "SERVER_MESSAGE.ACCOUNT_CREATED_OTP_SEND",
              data: {
                user_id: result.id,
                ...user,
              },
            });
          } else {
            return res.status(500).json({
              error_code: 109,
              status: false,
              errors: "SERVER_MESSAGE.SONTHING_WRONG",
            });
          }
        });
      });
    } catch (error) {
      return res.status(500).json({
        error_code: 101,
        status: false,
        errors: `${error}`,
      });
    }
  }
}

async function checkUserAuthenticator(req, res, next) {
  try {
    const login_id = req.body.login_id;
    const password = req.body.password;

    let attributes = [
      "id",
      "user_id",
      "first_name",
      "last_name",
      "email",
      "password",
      "phone_number",
      "need_password_reset",
    ];

    var user_authenticator = await db.user_authenticator.findOne({
      attributes: attributes,
      where: {
        [Op.or]: [
          {
            email: {
              [Op.eq]: login_id,
            },
          },
          {
            phone_number: {
              [Op.eq]: login_id,
            },
          },
        ],
      },
      include: [
        {
          model: db.user,
          attributes: [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "password",
            "national_id",
            "city_code",
            "device_id",
            "device_type",
            "picture",
            "company_name",
            "dob",
            "status",
          ],
          as: "user",
          include: ['user_role']
        },
        {
          model: db.org_staff_permission,
          as: 'permissions',
          include: ['group']
        }
      ],
    });
    // console.log('user_authenticator', JSON.stringify(user_authenticator))
    if (!user_authenticator) {
      return res.status(406).json({
        error_code: 106,
        status: false,
        errors: "SERVER_MESSAGE.USER_ID_INCORRECT",
      });
    }

    var isMatch = await bcrypt.compare(password, user_authenticator.password);
    if (isMatch) {
      delete user_authenticator.dataValues.password;
      // let expiredAt = new Date();
      // const minuts = expiredAt.getHours();
      // let expitedAt1 = new Date(expiredAt.setHours(minuts + 2000));
      const hash = await generateToken({ name: user_authenticator.first_name, group: 'client', role: 5, pu_id: user_authenticator.id });
      const token = await db.token.create({
        userId: user_authenticator.user_id,
        token: hash,
        expired_at: null,
        login_as: user_authenticator.dataValues.id,
      });

      var user = JSON.parse(JSON.stringify(user_authenticator.user));
      var permissions = {};
      if (!!user_authenticator.permissions)
        permissions = JSON.parse(JSON.stringify(user_authenticator.permissions));
      if (typeof permissions == 'string') permissions = JSON.parse(permissions);

      user_authenticator.dataValues.user_role = user.user_role;
      user_authenticator.dataValues.parent = user;
      user_authenticator.isSeconday = true;

      user_authenticator.user_role = {
        role: 5,
      };

      user_authenticator = JSON.parse(JSON.stringify(user_authenticator));
      user_authenticator = {
        ...user,
        ...user_authenticator,
        permissions: permissions.permissions || [],
        id: user.id,
        staff_id: user_authenticator.id,
        need_password_reset: user_authenticator.need_password_reset,
      };
      delete user_authenticator.user;
      return res.set("auth-token", hash).status(200).json({
        error: false,
        status: "Success",
        user: user_authenticator,
      });
    } else {
      return res.status(400).json({
        error_code: 107,
        status: false,
        errors: "SERVER_MESSAGE.PASSWORD_INCORRECT",
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(400).json({
      error_code: 107,
      status: false,
      errors: e,
    });
  }
}

async function checkUserFmaily(req, res, next) {
  try {
    const login_id = req.body.login_id;
    const password = req.body.password;

    let attributes = [
      "id",
      "user_id",
      "first_name",
      "gender",
      "email",
      "password",
      "phone",
      "last_name",
      "middle_name",
      "national_id",
      "dob",
      "relation",
      "note",
      "image",
      "allow_access",
      "emergency_contact",
      "need_password_reset",
    ];

    var user_family = await db.user_family.findOne({
      attributes: attributes,
      where: {
        [Op.or]: [
          {
            email: {
              [Op.eq]: login_id,
            },
          },
          {
            phone: {
              [Op.eq]: login_id,
            },
          },
        ],
      },
      include: ["family_medical", "medical_conditions", "family_document"],
    });

    if (!user_family) {
      return checkUserAuthenticator(req, res, next);
    }

    if (!user_family.allow_access) {
      return res.status(406).json({
        error_code: 105,
        status: false,
        errors: "SERVER_MESSAGE.NOT_ALLOWED",
      });
    }

    var isMatch = await bcrypt.compare(password, user_family.password);
    if (isMatch) {
      delete user_family.dataValues.password;
      // let expiredAt = new Date();
      // const minuts = expiredAt.getHours();
      // let expitedAt1 = new Date(expiredAt.setHours(minuts + 2000));
      const hash = await generateToken({ name: user_family.first_name, group: 'client', role: 2 });
      const token = await db.token.create({
        userId: user_family.user_id,
        token: hash,
        expired_at: null,
        login_as: user_family.dataValues.id,
      });

      var user = await db.user.findOne({
        attributes: [
          "id",
          "first_name",
          "middle_name",
          "last_name",
          "email",
          "password",
          "national_id",
          "city_code",
          "device_id",
          "device_type",
          "picture",
          "company_name",
          "dob",
          "status",
        ],
        where: {
          id: user_family.user_id,
        },
        include: [
          {
            model: db.user_role,
            attributes: ["role_id"],
          },
          "medical_conditions",
          "documents",
          "insurance",
          "user_medical",
        ],
      });
      user = user.dataValues;

      user_family.dataValues.user_role = user.user_role;
      user_family.dataValues.parent = user;
      user_family.dataValues.isSeconday = true;
      user_family.dataValues.status = 0; //user.status; Prevent family user : navigate other page.

      return res.set("auth-token", hash).status(200).json({
        error: false,
        status: "Success",
        user: user_family,
      });
    } else {
      return res.status(400).json({
        error_code: 107,
        status: false,
        errors: "SERVER_MESSAGE.PASSWORD_INCORRECT",
      });
    }
  } catch (e) {
    return res.status(400).json({
      error_code: 107,
      status: false,
      errors: e,
    });
  }
}

async function login(req, res, next) {
  try {
    const { errors, isValid } = validateLoginInput(req.body);
    // Check validation
    if (!isValid) {
      return res.status(400).json(errors);
    }
    const login_id = req.body.login_id;
    const password = req.body.password;
    const role = req.body.role || null;
    let whereCond = {
      [Op.or]: [
        {
          email: {
            [Op.eq]: login_id,
          },
        },
        {
          phone_number: {
            [Op.eq]: login_id,
          },
        },
      ],
    }
    let roleCond = {}
    if (!!role) {
      roleCond = {
        '$user_role.role_id$': role,
      }
    }
    console.log(whereCond)
    let attributes = [
      "id",
      "first_name",
      "middle_name",
      "last_name",
      "email",
      "password",
      "national_id",
      "city_code",
      "device_id",
      "device_type",
      "picture",
      "company_name",
      "dob",
      "status",
      "isAvailableStatus",
      "isSigned",
      "country_id",
      "need_password_reset",
      "first_login",
      "password_expiry",
    ];
    let role_attributes = ["role_id"];
    var user = await db.user.findOne({
      attributes: attributes,
      include: [
        "charges",
        "availability",
        "practice",
        "services",
        "education",
        "address",
        "user_location",
        // 'isAvailableStatus',
        {
          model: db.user_role,
          as: 'user_role', where: roleCond,
          attributes: role_attributes,
        },
        {
          model: db.user_insurance,
          foreignKey: "user_id",
          where: {
            member_id: 0,
          },
          as: "insurance",
          required: false,
        },
      ],
      where: whereCond,
      // include: [{ model: db.user_role, attributes: role_attributes }]
    });
    if (!user) {
      return checkUserAuthenticator(req, res, next);
    }
    if (!!user.email_verified) {
      return res.status(406).json({
        error_code: 105,
        status: false,
        errors: "SERVER_MESSAGE.EMAIL_NOT_VERIFIED",
      });
    }
    let sqlA = `SELECT uk.*, u.id uid FROM user_kindreds uk
      LEFT JOIN users u ON u.id = uk.user_id AND u.deletedAt IS NULL
      WHERE member_id = ${user.id}`;
    let fa = await db.sequelize.query(sqlA).spread((r, m) => {
      return r[0]
    })
    if (!!fa && !!fa.uid && !!!fa.allow_access) {
      return res.status(406).json({
        error_code: 107,
        status: false,
        errors: "SERVER_MESSAGE.PERMISSION_ERROR",
      });
    }
    var isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      if (user.status == -1) {
        return res.status(400).json({
          error_code: 107,
          status: false,
          errors: "SERVER_MESSAGE.ACCOUNT_SUSPENDED",
        });
      }

      if (user.status == -2) {
        return res.status(400).json({
          error_code: 107,
          status: false,
          errors: "SERVER_MESSAGE.ACCOUNT_CLOSED",
        });
      }
      if (!!!user.password_expiry) {
        let todate = new Date().getDate();
        let expiry = new Date(new Date().setDate(todate + 30));
        await user.update({
          password_expiry: expiry,
        });
      }

      if (Date.now() > new Date(user.password_expiry).getTime()) {
        user.update({
          need_password_reset: 1,
        });
      }
      delete user.dataValues.password;
      let platform = "web";
      if (
        /*/mobile|android/i.test(req.get('user-agent'))*/ req.headers[
        "platform"
        ] == "android" &&
        req.headers["fcm_token"]
      ) {
        platform = "android";
        await db.notification_subscription.destroy({
          where: { platform: { [Op.in]: ["android", "ios"] } },
        });

        let notification_subscription = await db.notification_subscription.findOrCreate(
          {
            where: {
              user_id: user.id,
              platform: "android",
            },
          }
        );
        await notification_subscription[0].update({
          user_id: user.id,
          platform: "android",
          subscription: {
            fcm_token: req.headers["fcm_token"],
          },
        });
      }
      if (
        /*/mobile|iphone|ipod/i.test(req.get('user-agent'))*/ req.headers[
        "platform"
        ] == "ios" &&
        req.headers["fcm_token"]
      ) {
        platform = "ios";
        await db.notification_subscription.destroy({
          where: { platform: { [Op.in]: ["android", "ios"] } },
        });

        let notification_subscription = await db.notification_subscription.findOrCreate(
          {
            where: {
              user_id: user.id,
              platform: "ios",
            },
          }
        );
        await notification_subscription[0].update({
          user_id: user.id,
          platform: "ios",
          subscription: {
            fcm_token: req.headers["fcm_token"],
          },
        });
      }

      const hash = await generateToken({ name: user.first_name, group: 'client', role: user.user_role.role_id });

      var prev_token = await db.token.findOne({
        where: {
          userId: user.id,
          login_as: 0,
          is_for_link: false,
          platform: platform,
          expired_at: {
            [Op.gt]: new Date(),
          },
        },
      });
      var is_online = true;
      if (prev_token) is_online = prev_token.is_online;
      user.dataValues.isAvailableStatus = is_online;

      await db.token.destroy({
        where: {
          userId: user.id,
          login_as: 0,
          is_for_link: false,
          platform: platform,
        },
      });
      const token = await db.token.create({
        userId: user.id,
        token: hash,
        expired_at: null,
        login_as: 0,
        platform: platform,
        is_online: is_online,
      });
      res.set("auth-token", hash).status(200).json({
        error: false,
        status: "Success",
        user: user,
      });

      addActivityLog({
        user_id: user.id,
        type: "Login",
        details: ``,
        data: {
          userAgent: req.headers["user-agent"],
          platform,
        },
      });

      let zn = null;
      if (!!req.body.timezoneOffset) zn = req.body.timezoneOffset;

      await db.user.update(
        {
          first_login: false,
          timezone_offset: zn,
        },
        {
          where: {
            id: user.id,
          },
        }
      );
      if (!user.first_login) return;

      try {
        var associatedTo = await db.associate.findOne({
          where: {
            associate: user.id,
          },
        });

        if (associatedTo && associatedTo.user) {
          associatedTo = JSON.parse(JSON.stringify(associatedTo));
          var clinic = associatedTo.user;

          crmTrigger(
            "staff_Checked_in",
            {
              email: clinic.email,
              staff_name: user.fullName,
              staff_photo: user.picture,
              staff_email: user.email,
              staff_profile_link: `${config.domains.clinic}/my-staff/view/${user.id}`,
              company_name: clinic.company_name,
              user_name: clinic.company_name,
            },
            clinic.lang || req.lang || "en"
          );
        }
      } catch (e) {
        console.log(e);
      }

      try {
        var customeredTo = await db.customer.findOne({
          where: {
            customer: user.id,
          },
          include: ["user"],
        });

        if (customeredTo && customeredTo.user) {
          customeredTo = JSON.parse(JSON.stringify(customeredTo));
          var clinic = customeredTo.user;

          crmTrigger(
            "Patient_Checked_in",
            {
              email: clinic.email,
              patient_name: user.fullName,
              patient_photo: user.picture,
              patient_email: user.email,
            },
            clinic.lang || req.lang || "en"
          );
        }
      } catch (e) {
        console.log(e);
      }
    } else {
      return res.status(400).json({
        error_code: 107,
        status: false,
        errors: "SERVER_MESSAGE.PASSWORD_INCORRECT",
      });
    }
  } catch (error) {
    return res.status(500).json({
      error_code: 105,
      status: false,
      error: `${error}`,
    });
  }
}

async function validatePin(req, res, next) {
  console.log(req.body);
  try {
    let data = req.body;
    // temp code start here
    if (+data.pin == 999999) {
      res.status(200).json({
        error: false,
        status: "Success",
        message: "SERVER_MESSAGE.Email verified successfully",
      });

    }

    // temp code end here
    db.pin
      .findOne({
        where: {
          user_id: data.user_id,
          pin: data.pin,
        },
      })
      .then(async (resp) => {
        db.user
          .update(
            {
              email_verified: 1,
            },
            {
              where: {
                id: data.user_id,
              },
            }
          )
          .then(async () => {
            await resp.update({
              status: 1,
            });

            res.status(200).json({
              error: false,
              status: "Success",
              message: "SERVER_MESSAGE.Email verified successfully",
            });
          })
          .catch((err) => {
            res.status(400).json({
              error: `${err}`,
              status: false,
              message: "Invalid Pin",
            });
          });
      })
      .catch((err) => {
        res.status(400).json({
          error: `${err}`,
          status: false,
          message: "Invalid Pin",
        });
      });
  } catch (error) {
    return res.status(500).json({
      error_code: 105,
      status: false,
      error: `${error}`,
    });
  }
}
// const { errors, isValid } = validateRegisterInput.validateRegisterInput(req.body);
async function resetPassword(req, res, next) {
  try {
    bcrypt.genSalt(10, async function (err, salt) {
      bcrypt.hash(req.body.password, salt, async function (err, hash) {
        if (err) throw err;
        //console.log(hash);
        let new_password = hash;
        var result = await db.user.update(
          {
            password: new_password,
          },
          {
            where: {
              id: req.user.id,
            },
          }
        );
        if (result && result != 0) {
          res.status(200).json({
            error: "false",
            status: "Success",
            message: "SERVER_MESSAGE.Password successfully updated !",
            data: result,
          });
        } else {
          return res.status(500).json({
            error_code: 109,
            status: false,
            errors: "SERVER_MESSAGE.Password Not updated. Please try again !",
          });
        }
      });
    });
  } catch (error) {
    return res.status(500).json({
      error_code: 105,
      status: false,
      error: `${error}`,
    });
  }
}

async function checkUniqueField(req, res, next) {
  const value = req.body.value;
  const field = req.body.field;
  if (value && field) {
    const user = await db.user.findOne({
      where: {
        [field]: value,
      },
    });
    if (user) {
      return res.status(409).json({
        error_code: 102,
        status: false,
        errors: `${field} id already configured`,
      });
    }
    return res.send(null);
  } else {
    return res.send(null);
  }
}

async function updateUserProfile(req, res, next) {
  if (req.user && req.user.id) {
    upload(req, "avatar", "file").then(async (resp) => {
      await db.user.update(
        {
          picture: resp.path,
        },
        {
          where: {
            id: req.user.id,
          },
        }
      );
      res
        .send({
          status: true,
          path: resp.path,
          // bug
        })
        .catch((err) => {
          res.status(404).json({
            error: true,
            status: false,
            errors: `${err}`,
          });
        });
    });
  } else {
    res.status(404).json({
      error: true,
      status: false,
      errors: `AUTH MISSING`,
    });
  }
}

async function updateSignature(req, res, next) {
  if (req.user && req.user.id) {
    upload(req, "signature", "file")
      .then(async (resp) => {
        await db.user.update(
          {
            signature: resp.path,
          },
          {
            where: {
              id: req.user.id,
            },
          }
        );
        res.send({
          status: true,
          path: resp.path,
          // bug
        });
      })
      .catch((err) => {
        res.status(404).json({
          error: true,
          status: false,
          errors: `${err}`,
        });
      });
  } else {
    res.status(404).json({
      error: true,
      status: false,
      errors: `AUTH MISSING`,
    });
  }
}

async function userInfo(req, res, next) {
  // res.send(req.lang)
  if (req.user && req.user.id) {
    if (req.user.authenticator_id) {
      var user = await db.user.scope("unlimited").findOne({
        include: [
          // "charges",
          "availability",
          // "practice",
          // "services",
          // "education",
          "address",
          "contract",
          // "associatedTo",
          {
            model: db.user_role,
            attributes: ["role_id"],
          },
        ],
        where: {
          id: req.user.user_id,
        },
      });
      var user_authenticator = await db.user_authenticator.findOne({
        where: {
          id: req.user.authenticator_id,
        },
        include: [{
          model: db.org_staff_permission,
          as: 'permissions',
          include: ['group']
        }]
      });
      user_authenticator.user_role = {
        role: 5,
      };
      let permissions = []
      if (user_authenticator.permissions) {
        if (user_authenticator.permissions.group) {
          permissions = user_authenticator.permissions.group.permissions || []
        } else {
          permissions = user_authenticator.permissions.permissions || []
        }
        if (typeof permissions == 'string') permissions = JSON.parse(permissions);
      }
      var respone = {
        ...JSON.parse(JSON.stringify(user)),
        ...JSON.parse(JSON.stringify(user_authenticator)),
        permissions: permissions,
        id: user.id,
        authenticator_id: req.user.authenticator_id,
        need_password_reset: user_authenticator.need_password_reset,
      };
      res.send(respone);
      return;
    }

    await db.userLastLogin.findOrCreate({ where: { user_id: req.user.id } })
      .then(resp => resp[0].update({ lastLogin: new Date(), platform: req.headers['platform'] || 'web' }))

    let userId = req.user.id;
    if (req.query && req.query.id) {
      userId = req.query.id;
    }
    let professional_detail = null;
    let include = ["user_role", "contract"];
    if (req.user && req.user.role == 2) {
      professional_detail = await db.customer.findOne({
        where: { customer: req.user.id, "$company.user_role.role_id$": 13 },
        include: [
          {
            model: db.user,
            include: ["user_role"],
            as: "company",
          },
        ],
      });
      include.push(
        "user_medical"
        // 'professional_detail'
      );
    }
    if (req.user && req.user.role == 1) {
      include.push(
        "practice",
        "services",
        "education",
        "user_medical",
        "licence",
        "rating_summary",
        "associatedTo"
      );
    }
    if (req.query && req.query.includes) {
      include = req.query.includes.split(",");
    }
    include = [
      ...include,
      {
        model: db.address,
        foreignKey: "user_id",
        as: "address",
        required: false,
      },
      {
        model: db.user_insurance,
        foreignKey: "user_id",
        as: "insurance",
        required: false,
      },
    ];
    db.user
      .scope("unlimited")
      .findByPk(userId, {
        include: include,
      })
      .then(async (data) => {
        if (req.user.role == 1)
          data.update({
            isAvailableStatus: req.user.is_online,
          });
        else
          data.update({
            isAvailableStatus: true,
          });
        let d = JSON.parse(JSON.stringify(data));
        if (req.user.role == 1) {
          if (!!!req.query || !!!req.query.includes) {
            var services = [];
            try {
              services = await db.user_service.findAll({
                where: {
                  user_id: d.id,
                },
                include: ["department", "speciality"],
              });
            } catch (e) { }
            d.services = services;
          }
        }
        if (req.user.role == 2 || req.user.role == 5) {
          let sq1 = `SELECT um.json_data FROM customers c
            JOIN usermeta um ON um.user_id=c.user_id AND 'key' = "networkVisibility"
            WHERE c.customer = ${req.user.id} OR  c.user_id = ${req.user.id} LIMIT 1`;
          sq1 = sq1.replace(/\'/g, '`')
          let ntc = await db.sequelize.query(sq1).spread((r, m) => (r[0] || {})).catch(e => { return {} });
          if (!!ntc && !!ntc.json_data)
            d.patientCloseEnvironment = ntc.json_data.patientCloseEnvironment
        }
        // if (req.user.role == 2) {
        //   let cons = await db.booking.findOne({ where: { patient_id: req.user.id, payment_status: 1 } }).catch(r => null);
        //   d.profileLock = !!cons && !!cons.id
        // }
        let resData = d;
        resData["profile_completion_status"] = profileCompletionStatus(
          req.user.role,
          resData
        );
        if (!!professional_detail)
          resData["professional_detail"] = professional_detail.company;
        // console.log(JSON.parse(JSON.stringify(resData)))
        if (resData.password) delete resData.password;
        res.send(resData);

        if (!!resData.is_profile_completed) return;
        try {
          await db.user.update(
            {
              is_profile_completed: true,
            },
            {
              where: {
                id: req.user.id,
              },
            }
          );

          if (
            resData["profile_completion_status"] == 100 &&
            req.user.role == 2
          ) {
            var customeredTo = await db.customer.findOne({
              where: {
                customer: req.user.id,
              },
              include: ["user"],
            });

            if (customeredTo && customeredTo.user) {
              customeredTo = JSON.parse(JSON.stringify(customeredTo));
              var clinic = customeredTo.user;

              crmTrigger(
                "Patient_activated",
                {
                  email: clinic.email,
                  patient_name: `${resData.fullName}`,
                  patient_photo: resData.picture,
                  patient_email: resData.email,
                },
                clinic.lang || req.lang || "en"
              );
            }
          }
        } catch (e) {
          // console.log(e);
        }
      })
      .catch((err) => {
        res.status(400).json({
          error: true,
          status: false,
          errors: `${err}`,
        });
      });
  } else {
    res.sendStatus(406);
  }
}

async function userInfoEmailCheck(req, res, next) {
  var data = req.body;
  if (data.email) {
    var exist = await db.user
      .findOne({
        where: {
          email: data.email,
        },
      })
      .catch((err) => {
        return res.status(404).json({
          error: true,
          status: false,
          errors: `${err}`,
        });
      });
    if (!!exist) {
      if (exist.email == data.email) {
        return res.status(406).json({
          error_code: 101,
          status: false,
          errors: "EMAIL_UNAVALABLE",
        });
      }
    }
    return res.send({
      status: true,
      message: "Email Available",
    });
  } else if (data.phone) {
    var exist = await db.user
      .findOne({
        where: {
          phone_number: data.phone,
          isd_code: data.isd,
        },
      })
      .catch((err) => {
        return res.status(404).json({
          error: true,
          status: false,
          errors: `${err}`,
        });
      });
    if (!!exist) {
      if (exist.phone_number == data.phone && exist.isd_code == data.isd) {
        return res.status(406).json({
          error_code: 101,
          status: false,
          errors: "PHONE_UNAVALABLE",
        });
      }
    }
    return res.send({
      status: true,
      message: "Phone Available",
    });
  } else {
    return res.status(406).send({
      error: true,
      message: "Invalid/empty request",
    });
  }
}

async function updateUserInfo(req, res, next) {
  const { errors, isValid } = await userInfoValidation.userInfoValidation(
    req.body
  );
  if (!isValid) {
    return res.status(400).json({
      error_code: 101,
      status: false,
      errors: errors,
    });
  } else {
    if (req.user && req.user.id) {
      let data = req.body;
      if (!!!data.national_id) data['national_id'] = null;
      if (data.password) {
        delete data.password;
      }
      let or = [{ phone_number: data.phone_number }];
      if (data.email) {
        or.push({
          email: data.email,
        });
      }
      let user = await db.user.findByPk(req.user.id);
      var existUser = await db.user.findOne({
        where: {
          email_verified: 1,
          id: {
            [Op.ne]: req.user.id,
          },
          [Op.or]: or,
        },
      });
      if (existUser) {
        if (existUser.email == data.email && user.email !== data.email) {
          return res.status(406).send({
            error_code: 101,
            status: false,
            errors: "EMAIL_UNAVALABLE",
          });
        }
        if (existUser.phone_number == data.phone_number && user.phone_number !== data.phone_number) {
          return res.status(406).send({
            error_code: 101,
            status: false,
            errors: "PHONE_UNAVALABLE",
          });
        }
      }


      let userD = JSON.parse(JSON.stringify(user));
      user
        .update(data)
        .then(async (r) => {
          if (!!data.manager) {
            await updateOrgContacts({ ...data.manager, type: 'manager', user_id: req.user.id })
          }
          if (!!data.support) {
            await updateOrgContacts({ ...data.support, type: 'support', user_id: req.user.id })
          }
          if (!!!userD.status && !!data.status) {
            crmTrigger(
              "Patient_Profile_Completed",
              {
                email: userD.email,
                userName: userD.fullName,
              },
              userD.lang || req.lang || "en"
            );
          }
          if (!!userD.status) {
            crmTrigger(
              "You_Updated_Profile",
              {
                email: userD.email,
                userName: `${userD.fullName}`,
              },
              userD.lang || req.lang || "en"
            );
          }

          res.send({
            status: true,
            user: user,
          });
        })
        .catch((errors) => {
          res.status(406).send({
            error_code: 101,
            status: false,
            errors: errors,
          });
        });
      addActivityLog({
        user_id: req.user.id,
        type: "user information updated",
      });
    } else {
      res.sendStatus(406);
    }
  }
}

async function getUserConfig(req, res, next) {
  if (req.user && req.user.id) {
    var user_id = req.user.id;
    let query = req.query || {};
    if (query.user_id) user_id = query.user_id;

    var where = {
      user_id: user_id,
      member_id: 0,
    };
    if (query.member_id) where.member_id = query.member_id;
    db.user_config
      .findOne({
        where: where,
      })
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.status(404).json({
          error: true,
          status: false,
          errors: `${err}`,
        });
      });
  } else {
    res.sendStatus(406);
  }
}

async function updateUserConfig(req, res, next) {
  if (req.user && req.user.id) {
    var data = req.body;
    if (!!!data["user_id"]) data["user_id"] = req.user.id;
    if (!!!data["member_id"]) data["member_id"] = 0;
    var where = {
      user_id: data.user_id,
    };
    if (data["member_id"] != null) where.member_id = data.member_id;

    db.user_config
      .findOrCreate({
        where: where,
      })
      .then((resp) => {
        resp[0]
          .update(data)
          .then((resp2) => res.send(resp2))
          .catch((err) => {
            throw err;
          });
      })
      .catch((err) => {
        res.status(404).json({
          error: true,
          status: false,
          errors: `${err}`,
        });
      });
  } else {
    res.sendStatus(406);
  }
}

async function getUserAvailability(req, res, next) {
  if (req.user && req.user.id && req.body.id) {
    db.user_availability
      .findAll({
        where: {
          user_id: req.user.id,
          location_id: req.body.id,
        },
      })
      .then((data) => {
        res.send(data);
      })
      .catch((err) => {
        res.status(404).json({
          error: true,
          status: false,
          errors: `${err}`,
        });
      });
  } else {
    res.sendStatus(406);
  }
}

async function addUserSkill(req, res, next) {
  let data = req.body;
  if (req.user && req.user.id) {
    data["user_id"] = req.user.id;
    try {
      let resp = await db.user_skill.upsert(data);
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  } else {
    res.sendStatus(406);
  }
}

async function removeUserSkill(req, res, next) {
  if (req.user && req.user.id && req.body.id) {
    try {
      let resp = await db.user_skill.destroy({
        where: {
          id: req.body.id,
        },
      });
      res.send({
        status: true,
        data: resp,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  } else {
    res.sendStatus(406);
  }
}

async function skills(req, res, next) {
  if (req.user && req.user.id) {
    db.user_skill
      .findAll({
        where: {
          user_id: req.user.id,
        },
      })
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.status(400).send({
          status: false,
          errors: err,
        });
      });
  } else {
    res.sendStatus(406);
  }
}

async function skill(req, res, next) {
  if (req.user && req.user.id && req.body.id) {
    db.user_skill
      .findByPk(req.body.id)
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.status(400).send({
          status: false,
          errors: err,
        });
      });
  } else {
    res.sendStatus(406);
  }
}
async function resendOtp(req, res, next) {
  let data = req.body;
  if (data.user_id) {
    let user = await db.user.findOne({
      where: {
        id: data.user_id,
      },
      include: ["user_role"],
    });
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      let responce = await db.pin.create({
        user_id: data.user_id,
        pin: otp,
        status: 0,
      });
      let trigger = "New_Signup";

      var role_id = 1;
      if (user.user_role) role_id = user.user_role.role_id;

      if (role_id == 1) trigger = "New_Doctor_Signup";
      if (role_id == 2) trigger = "New_Patient_Signup";
      if (role_id == 3) trigger = "New_Nurse_Signup";
      if (role_id == 4) trigger = "New_Lab_Signup";
      if (role_id == 5) trigger = "New_Retail_Clinic_Signup";
      if (role_id == 6) trigger = "New_Pharmacy_Signup";

      smsTrigger(
        "New_Signup",
        {
          name: user.first_name,
          otp: otp,
          to: user.isd_code + user.phone_number,
        },
        req.headers["lang"],
        0
      );
      otpTrigger(
        trigger,
        {
          email: user.email,
          userName: user.first_name,
          otp: otp,
          text: `Please use this OTP for your account verification.`,
        },
        req.lang
      );

      res.status(200).send({
        error: false,
        status: "Success",
        message: "SERVER_MESSAGE.OTP_SENT",
        data: {
          user_id: data.user_id,
        },
      });
    } else {
      res.status(400).send({
        status: false,
        errors: "SERVER_MESSAGE.USER_ID_INCORRECT",
      });
    }
  } else {
    res.sendStatus(400);
  }
}

async function profileChangeOtp(req, res, next) {
  if (req.user && req.user.id) {
    let user = await db.user.findOne({
      where: {
        id: req.user.id,
      },
      include: ["user_role"],
    });
    if (user) {
      var userWhere = [];
      console.log(req.body);
      if (req.body.email) {
        userWhere.push({
          email: req.body.email,
        });
      }
      if (req.body.phone_number) {
        userWhere.push({
          phone_number: req.body.phone_number,
        });
      }

      var existUser = await db.user.findOne({
        where: {
          email_verified: 1,
          id: {
            [Op.ne]: req.user.id,
          },
          [Op.or]: userWhere,
        },
      });
      if (existUser) {
        if (existUser.email === req.body.email) {
          return res.status(406).send({
            error_code: 101,
            status: false,
            errors: "EMAIL_UNAVALABLE",
          });
        }
        if (existUser.phone_number === req.body.phone_number) {
          return res.status(406).send({
            error_code: 101,
            status: false,
            errors: "PHONE_UNAVALABLE",
          });
        }
      }

      const otp = Math.floor(100000 + Math.random() * 900000);
      let responce = await db.pin.create({
        user_id: req.user.id,
        pin: otp,
        status: 0,
      });
      var email = user.email;
      let phone_number = user.phone_number;

      if (req.body && req.body.email) email = user.email;
      if (req.body && req.body.phone_number) phone_number = user.phone_number;
      smsTrigger(
        "Profile_Change_OTP",
        {
          name: user.first_name,
          otp: otp,
          to: user.isd_code + phone_number,
        },
        req.headers["lang"],
        0
      );
      otpTrigger(
        "Profile_Change_OTP",
        {
          email: email,
          userName: user.first_name,
          otp: otp,
        },
        req.lang
      );

      res.status(200).send({
        error: false,
        status: "Success",
        message: "SERVER_MESSAGE.OTP_SENT",
        data: {
          user_id: req.user.id,
        },
      });
    } else {
      res.status(400).send({
        status: false,
        errors: "SERVER_MESSAGE.USER_ID_INCORRECT",
      });
    }
  } else {
    res.sendStatus(400);
  }
}

async function updateUserWithAudit(req, res, next) {
  if (req.user && req.user.id) {
    var data = req.body;
    var otp = req.body.otp;
    if (data.phone) {
      var userWhere = [];
      if (req.body.email) {
        userWhere.push({
          email: req.body.email,
        });
      }
      if (req.body.phone_number) {
        userWhere.push({
          phone_number: req.body.phone_number,
        });
      }

      var existUser = await db.user.findOne({
        where: {
          email_verified: 1,
          id: {
            [Op.ne]: req.user.id,
          },
          [Op.or]: userWhere,
        },
      });

      if (existUser) {
        if (existUser.email === req.body.email) {
          return res.status(406).send({
            error_code: 101,
            status: false,
            errors: "EMAIL_UNAVALABLE",
          });
        }
        if (existUser.phone_number === req.body.phone_number) {
          return res.status(406).send({
            error_code: 101,
            status: false,
            errors: "PHONE_UNAVALABLE",
          });
        }
      }
      var user = await db.user.findOne({
        where: {
          id: req.user.id,
        },
      });
      var detail = [];
      if (req.body.phone_number) {
        detail.push({
          type: "phone_number",
          old: user.phone_number,
          new: req.body.phone_number,
          remarks: req.body.remarks,
        });
      }
      let user_profile_log = await db.user_profile_log.create({
        user_id: req.user.id,
        detail: detail,
      });

      await db.signedContract.update(
        {
          status: 0,
          end: new Date(),
          user_profile_update_id: user_profile_log.id,
        },
        {
          where: {
            user_id: req.user.id,
            status: 1,
          },
        }
      );
      var userData = req.body;
      userData.isSigned = false;
      await db.user.update(userData, {
        where: {
          id: req.user.id,
        },
      });
      res.send({
        success: true,
      });
    }
    if (!data.phone) {
      db.pin
        .findOne({
          where: {
            user_id: req.user.id,
            pin: otp || 0, // Prevent error :: WHERE parameter "pin" has invalid "undefined" value
            status: 0,
          },
        })
        .then(async (resp) => {
          // if (req.body.picture == null && resp == null)// change picture: no need otp
          //   return res.status(400).send({
          //     status: false,
          //     errors: `INVALID_OTP`
          //   });

          if (otp > 0)
            await db.pin.update(
              { status: 1 },
              { where: { user_id: req.user.id, pin: otp } }
            ); // disable used otp

          var userWhere = [];
          if (req.body.email) {
            userWhere.push({
              email: req.body.email,
            });
          }
          if (req.body.phone_number) {
            userWhere.push({
              phone_number: req.body.phone_number,
            });
          }

          var existUser = await db.user.findOne({
            where: {
              email_verified: 1,
              id: {
                [Op.ne]: req.user.id,
              },
              [Op.or]: userWhere,
            },
          });
          if (existUser) {
            if (existUser.email === req.body.email) {
              return res.status(406).send({
                error_code: 101,
                status: false,
                errors: "EMAIL_UNAVALABLE",
              });
            }
            if (existUser.phone_number === req.body.phone_number) {
              return res.status(406).send({
                error_code: 101,
                status: false,
                errors: "PHONE_UNAVALABLE",
              });
            }
          }

          var user = await db.user.findOne({
            where: {
              id: req.user.id,
            },
          });

          var detail = [];

          if (req.body.picture) {
            detail.push({
              type: "picture",
              old: user.picture,
              new: req.body.picture,
              remarks: req.body.remarks,
            });
          }

          if (req.body.speciality_type) {
            detail.push({
              type: "speciality_type",
              old: user.speciality_type,
              new: req.body.speciality_type,
              remarks: req.body.remarks,
            });
          }

          if (data.address) {
            let address = await db.address.findOrCreate({
              where: {
                user_id: data.user_id,
                family_id: data.family_id,
              },
            });

            detail.push({
              type: "address",
              old: address.address,
              new: data.address,
              remarks: req.body.remarks,
            });

            let resp = await address[0].update(data);
          }

          if (req.body.email) {
            detail.push({
              type: "email",
              old: user.email,
              new: req.body.email,
              remarks: req.body.remarks,
            });
          }
          if (req.body.id_proof_type) {
            detail.push({
              type: "ID",
              old_type: user.id_proof_type,
              new_type: req.body.id_proof_type,
              old_id: user.national_id,
              new_id: req.body.national_id,
              old_copy: user.id_proof_copy,
              new_copy: req.body.id_proof_copy,
              remarks: req.body.remarks,
            });
          }

          let user_profile_log = await db.user_profile_log.create({
            user_id: req.user.id,
            detail: detail,
          });

          await db.signedContract.update(
            {
              status: 0,
              end: new Date(),
              user_profile_update_id: user_profile_log.id,
            },
            {
              where: {
                user_id: req.user.id,
                status: 1,
              },
            }
          );
          var userData = {
            isSigned: false,
            ...req.body,
          };

          await db.user.update(userData, {
            where: {
              id: req.user.id,
            },
          });
          res.send({
            success: true,
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(400).send({
            status: false,
            errors: `${err}`,
          });
        });
    }
  } else {
    res.sendStatus(400);
  }
}

async function getUsers(req, res, next) {
  let where = {
    status: {
      [Op.gt]: 0,
    },
  };
  if (req.body.id) {
    where.id = req.body.id;
    delete where.status;
  }
  if (req.query && req.query.id) {
    where.id = req.query.id;
    delete where.status;
  }
  if (req.body.name) {
    where.first_name = {
      [Op.like]: "%" + req.body.name + "%",
    };
  }
  if (req.body.email) {
    where.email = req.body.email;
  }
  if (req.body.national_id) {
    where.national_id = req.body.national_id;
  }
  if (req.body.phone_number) {
    where.phone_number = req.body.phone_number;
  }
  if (req.body.status) {
    where.status = req.body.status;
  }
  if (req.body.website) {
    where.website = req.body.website;
  }
  if (req.body.company_name) {
    where.company_name = {
      [Op.like]: "%" + req.body.company_name + "%",
    };
  }

  if (req.body.dob) {
    where.dob = req.body.dob;
  }
  if (req.query && req.query.online) {
    where.isAvailableStatus = true;
  }
  if (req.query && req.query.status) {
    where.status = req.query.status;
  }

  let page = 1;
  let order = [];
  if (req.query && req.query.page) {
    page = req.query.page;
  } else if (req.body.page) {
    page = req.body.page;
  }
  if (req.query && req.query.order) {
    order.push(req.query.order);
  } else if (req.body.order) {
    order.push(req.body.order);
  }
  if (req.query && req.query.order_by) {
    order.push(req.query.order_by);
  } else if (req.body.order_by) {
    order.push(req.body.order_by);
  }
  let address = await db.address.findOne({
    where: {
      user_id: req.user.id,
      family_id: 0,
    },
  });
  let insurance = await db.user_insurance.findOne({
    where: {
      user_id: req.user.id,
      member_id: 0,
    },
  });
  let include = [
    "country",
    "state",
    "user_medical",
    "licence",
    "family",
    "availability",
    "practice",
    "services",
    "education",
    "user_location",
    "documents",
    "skills",
    "user_speciality",
    "rating_summary",
  ];
  if (req.query && req.query.includes) {
    include = req.query.includes.split(",");
  }
  if (req.query && req.query.need_company) {
    include.push({
      model: db.associate,
      required: false,
      as: "associate",
      include: [
        {
          model: db.user,
          as: "user",
          attributes: ["id", "company_name", "picture"],
          include: ["insurance_associates"],
        },
      ],
    });
    include.push({
      model: db.my_favorite,
      as: "favorite_of",
      left: false,
      // paranoid: false,
      required: false,
      where: {
        user_id: req.user.id,
      },
    });
    if (req.query.department_id || req.body.department_id) {
      let depId = req.query.department_id || req.body.department_id;
      let w = {
        department_id: depId,
      };
      include.push({
        model: db.user_service,
        as: "services",
        where: w,
        include: ["department"],
      });
    } else {
      include.push({
        model: db.user_service,
        as: "services",
        include: ["department"],
      });
    }
    include.push("insurance_associates");
  }

  if (req.query && req.query.role && req.query.role == 5) {
    // retail clinics
    include.push({
      model: db.user_service,
      as: "services",
      include: ["department"],
    });
    include.push("insurance_associates");
    include.push({
      model: db.my_favorite,
      as: "favorite_of",
      left: false,
      // paranoid: false,
      required: false,
      where: {
        user_id: req.user.id,
      },
    });
  }

  if (req.query && req.query.dated) {
    include.push({
      model: db.schedule,
      where: {
        start: {
          [Op.gte]: new Date(req.query.dated),
        },
      },
      as: "schedule",
      calendarId: {
        [Op.in]: [4],
      },
      state: {
        [Op.ne]: "Busy",
      },
    });
  }
  if ((req.query && req.query.role) || req.body.role) {
    let role_id = req.query.role || req.body.role;
    include.push({
      model: db.user_role,
      where: {
        role_id,
      },
    });
    if (role_id !== 2) {
      include.push("address");
    }
  } else {
    include.push({
      model: db.user_role,
      where: {
        role_id: {
          [Op.ne]: 2,
        },
      },
    });
  }

  let options = {
    page: page,
    paginate: 2500,
    order: order,
    where: where,
    include: include,
  };

  db.user
    .paginate(options)
    .then((resp) => {
      let d = JSON.parse(JSON.stringify(resp));
      let ad = JSON.parse(JSON.stringify(address));
      let ins = JSON.parse(JSON.stringify(insurance));
      d.docs["address"] = ad;
      d.docs["insurance"] = ins;
      // d.docs = { ...d.docs, address: ad, insurance: ins };
      res.send(d);
    })
    .catch((err) => {
      res.status(400).send({
        status: false,
        errors: `${err}`,
      });
    });
}

async function getAvailableSloatOfClinic(clinic_id) {
  let start = new Date();
  let end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  let scheduleList = [];
  try {
    var myStaff = await db.user.findAll({
      include: [
        {
          model: db.user_role,
          as: "user_role",
          where: {
            role_id: {
              [Op.in]: [1, 3],
            }, //doctor & nurse
          },
        },
        {
          model: db.associate,
          as: "associate",
          where: {
            user_id: clinic_id,
          },
        },
      ],
    });
    var staffIdList = [];
    if (myStaff) staffIdList = myStaff.map((item) => item.id);
    console.log(staffIdList);

    let resp = await db.schedule.findAll({
      where: {
        user_id: {
          [Op.in]: staffIdList,
        },
        calendarId: {
          [Op.in]: [4],
        },
        start: {
          [Op.gte]: start,
        },
        end: {
          [Op.lte]: end,
        },
        state: {
          [Op.ne]: "Busy",
        },
      },
      order: [["start", "asc"]],
      // limit: 1
    });
    let data = JSON.parse(JSON.stringify(resp));
    scheduleList = data.filter((e) => new Date(e.start).getTime() > Date.now());
  } catch (e) { }
  return scheduleList;
}

async function getUsersEx(req, res, next) {
  let where = {
    status: {
      [Op.gt]: 0,
    },
  };
  if (req.body.id) {
    where.id = req.body.id;
  }
  if (req.query && req.query.id) {
    where.id = req.query.id;
  }
  if (req.body.name) {
    where.first_name = {
      [Op.like]: "%" + req.body.name + "%",
    };
  }
  if (req.body.email) {
    where.email = req.body.email;
  }
  if (req.body.national_id) {
    where.national_id = req.body.national_id;
  }
  if (req.body.phone_number) {
    where.phone_number = req.body.phone_number;
  }
  if (req.body.status) {
    where.status = req.body.status;
  }
  if (req.body.website) {
    where.website = req.body.website;
  }
  if (req.body.company_name) {
    where.company_name = {
      [Op.like]: "%" + req.body.company_name + "%",
    };
  }
  if (req.body.search) {
    where.company_name = {
      [Op.like]: "%" + req.body.search + "%",
    };
  }

  if (req.body.dob) {
    where.dob = req.body.dob;
  }
  if (req.query && req.query.online) {
    where.isAvailableStatus = true;
    try {
      var idList = Object.keys(global.onlineSocket);
      idList = idList
        .filter((id) => id.includes("userid"))
        .map((id) => id.replace("userid", ""))
        .filter((id) => parseInt(id) > 0);
      if (!!!where.id)
        where.id = {
          [Op.in]: idList,
        };
    } catch (e) {
      console.log(e);
    }
  }
  if (req.query && req.query.status) {
    where.status = req.query.status;
  }

  let page = 1;
  let order = [];
  if (req.query && req.query.page) {
    page = req.query.page;
  }
  if (req.query && req.query.order) {
    order.push(req.query.order);
  } else if (req.body.order) {
    order.push(req.body.order);
  }
  if (req.query && req.query.order_by) {
    order.push(req.query.order_by);
  } else if (req.body.order_by) {
    order.push(req.body.order_by);
  }
  let include = [
    "country",
    "state",
    "city",
    "user_medical",
    "licence",
    "family",
    "availability",
    "practice",
    "services",
    "education",
    "user_location",
    "documents",
    "skills",
    "user_speciality",
    "rating_summary",
  ];
  if (req.query && req.query.includes) {
    include = req.query.includes.split(",");
  }
  if (req.query && req.query.expertise_level != null) {
    where.expertise_level = req.query.expertise_level;
  }

  if (req.query.department_id || req.body.department_id) {
    let depId = req.query.department_id || req.body.department_id;
    let w = {
      department_id: depId,
    };
    include.push({
      model: db.user_service,
      as: "services",
      where: w,
      include: ["department"],
    });
  } else {
    // include.push({
    //   model: db.user_service,
    //   as: 'services',
    //   include: ['department']
    // });
  }

  if (req.query && req.query.clinic_id) {
    include.push({
      model: db.associate,
      as: "associatedTo",
      where: {
        user_id: req.query.clinic_id,
      },
      required: true,
    });
  }

  include.push({
    model: db.my_favorite,
    as: "favorite_of",
    left: false,
    // paranoid: false,
    required: false,
    where: {
      user_id: req.user.id,
    },
  });

  if (req.query && req.query.role && req.query.role == 5) {
    // retail clinics
    include.push({
      model: db.user_service,
      as: "services",
      include: ["department"],
    });
    include.push("insurance_associates");
  }
  var speciality_id = 0;
  if (req.query && req.query.speciality_id) {
    speciality_id = req.query.speciality_id;
    include.push({
      model: db.user_service,
      as: "services",
      include: ["speciality"],
      where: {
        speciality_id: req.query.speciality_id,
      },
      required: true,
    });
  } else {
    include.push({
      model: db.user_service,
      as: "services",
      include: ["speciality"],
      // where: {
      //   speciality_id: req.query.speciality_id
      // },
      // required: true
    });
  }

  if (req.query && req.query.dated) {
    let endDate = null;
    if (req.query.date_to) {
      endDate = req.query.date_to;
    } else {
      endDate = new Date(req.query.dated);
      endDate.setHours(0);
      endDate.setMinutes(0);
      endDate.setSeconds(0);
      endDate.setDate(endDate.getDate() + 2);
    }
    include.push({
      model: db.schedule,
      where: {
        start: {
          [Op.gte]: new Date(req.query.dated),
        },
        end: {
          [Op.lte]: new Date(endDate),
        },
        calendarId: {
          [Op.in]: [4],
        },
        state: {
          [Op.ne]: "Busy",
        },
      },
      required: true,
      attributes: ["id", "start", "end"],
      as: "schedule",
    });
  }
  var role = 0;
  if ((req.query && req.query.role) || req.body.role) {
    let role_id = req.query.role || req.body.role;
    role = role_id;
    include.push({
      model: db.user_role,
      where: {
        role_id: role_id,
      },
    });
    if (role_id === 3) {
      include.push("address");
    }
  } else if (req.body && req.body.role_list) {
    include.push({
      model: db.user_role,
      where: {
        role_id: {
          [Op.in]: req.body.role_list,
        },
      },
    });
  } else {
    include.push("user_role");
  }

  let options = {
    include: include,
    where: where,
    limit: getLimitOffset(page),
    distinct: true,
    col: `id`,
  };
  db.user
    .scope("publicInfo", "availableStatus")
    .findAndCountAll(options)
    .then(async (resp) => {
      try {
        resp = JSON.parse(JSON.stringify(resp));

        let need_company = false;
        if (req.query && req.query.need_company) {
          need_company = req.query.need_company;
        }
        if (!!need_company) {
          var patient_id = req.user.id;
          if (req.query && req.query.patient_id)
            patient_id = req.query.patient_id;
          var family_id = 0;
          if (req.query && req.query.family_id) family_id = req.query.family_id;
          var patient_user_insurance = await db.user_insurance.findOne({
            where: {
              user_id: patient_id,
              member_id: family_id,
            },
          });
        }
        let result = [];
        // for (let user of resp) {
        for (var i = 0; i < resp.rows.length; i++) {
          let user = resp.rows[i];
          if (role == 5) {
            let r = await getAvailableSloatOfClinic(user.id);
            user.schedule = r;
          }
          if (!!need_company) {
            await getClinicOfUser(
              user,
              patient_user_insurance ? patient_user_insurance.company : null
            );
            if (
              user.associatedTo &&
              user.associatedTo.user &&
              user.associatedTo.user.insurance_associates &&
              patient_user_insurance
            ) {
              user.services = (user.services || []).filter((s) => s.price > 0); // hide zero price services;

              let pr = user.associatedTo.user.insurance_associates.find(
                (r) => r.provider_id == patient_user_insurance.company
              );
              if (pr && pr.provider)
                user.insurance_associates = pr.provider.name;
            }
          }
          if (!!speciality_id && !!user.services) {
            user.service_price = {
              service: user.services[0].service,
              price: user.services[0].price,
            };
          }
          if (
            !!!user.service_price ||
            (user.service_price && user.service_price.price > 0)
          ) {
            result.push(user);
          }
        }
        // if (req.query && req.query.need_company) {
        //   var patient_user_insurance = await db.user_insurance.findOne({ where: { user_id: req.user.id } })
        //   for (var i = 0; i < resp.rows.length; i++) {
        //     let user = resp.rows[i];
        //     await getClinicOfUser(user, patient_user_insurance ? patient_user_insurance.company : null);

        //     if (
        //       user.associatedTo
        //       && user.associatedTo.user
        //       && user.associatedTo.user.insurance_associates
        //       && patient_user_insurance.company
        //     ) {
        //       user.insurance_associates = user.associatedTo.user.insurance_associates.find(r => r.provider_id == patient_user_insurance.company)
        //     }

        //     if (req.query && req.query.speciality_id) {
        //       user.service_price = user.services[0]
        //     }
        //   }
        // }
        resp.rows = result;
        res.send(resp);
      } catch (e) {
        console.log(e);
        throw e;
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(400).send({
        status: false,
        errors: `${err}`,
      });
    });
}

async function getUsersNearBy(req, res, next) {
  if (req.user && req.user.id) {
    var longitude = null;
    var latitude = null;
    if (req.body.longitude) longitude = req.body.longitude;
    if (req.body.latitude) latitude = req.body.latitude;

    if (latitude == null || latitude == null) {
      var patient_id = req.user.id;
      if (req.body.user_id) patient_id = req.body.user_id;
      var patient = await db.user.findOne({
        where: {
          id: patient_id,
        },
        include: [
          {
            model: db.address,
            as: "address",
          },
        ],
      });
      patient = JSON.parse(JSON.stringify(patient));

      if (patient.address == null) {
        return res.status(400).send({ status: false, message: 'user address missing' });
      }
      if (
        patient.address.longitude == null ||
        patient.address.latitude == null
      ) {
        return res.status(400).send({ status: false, message: 'address co-ordinate missing' });
      }

      var longitude = patient.address.longitude;
      var latitude = patient.address.latitude;
    }

    let where = {
      status: {
        [Op.gt]: 0,
      },
    };
    if (req.body && req.body.id) {
      where.id = req.body.id;
    }
    let page = 1;
    let order = [];
    if (req.query && req.query.page) {
      page = req.query.page;
    } else if (req.body.page) {
      page = req.body.page;
    }
    if (req.query && req.query.order) {
      order.push(req.query.order);
    } else if (req.body.order) {
      order.push(req.body.order);
    }
    if (req.query && req.query.order_by) {
      order.push(req.query.order_by);
    } else if (req.body.order_by) {
      order.push(req.body.order_by);
    }
    var roleWhere = {};
    if (req.body.role) {
      roleWhere = {
        role_id: req.body.role,
      };
    }
    var LIMIT_KM = 20 * 1.60934; // 20 Mile
    if (req.body && req.body.radius) {
      LIMIT_KM = parseInt(req.body.radius) * 1.60934;
    }
    var include = [
      // ,
      "rating_summary",
      {
        model: db.user_role,
        as: 'user_role',
        where: roleWhere,
      },
      {
        model: db.address,
        as: "address",
        attributes: {
          include: [
            [
              Sequelize.fn(
                "ST_Distance",
                Sequelize.fn(
                  "point",
                  Sequelize.col("address.longitude"),
                  Sequelize.col("address.latitude")
                ),
                Sequelize.fn("point", longitude, latitude)
              ),
              "distance",
            ],
          ],
        },
        required: false,
        where: {
          longitude: {
            [Op.ne]: null,
          },
          latitude: {
            [Op.ne]: null,
          },
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn(
                "ST_Distance",
                Sequelize.fn(
                  "point",
                  Sequelize.col("address.longitude"),
                  Sequelize.col("address.latitude")
                ),
                Sequelize.fn("point", longitude, latitude)
              ),
              "<",
              LIMIT_KM / 100
            ),
          ],
        },
      },
      {
        model: db.location.scope(''),
        as: "user_location",
        attributes: {
          include: [
            [
              Sequelize.fn(
                "ST_Distance",
                Sequelize.fn(
                  "point",
                  Sequelize.col("user_location.longitude"),
                  Sequelize.col("user_location.latitude")
                ),
                Sequelize.fn("point", longitude, latitude)
              ),
              "distance",
            ],
          ],
        },
        required: false,
        where: {
          longitude: {
            [Op.ne]: null,
          },
          latitude: {
            [Op.ne]: null,
          },
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn(
                "ST_Distance",
                Sequelize.fn(
                  "point",
                  Sequelize.col("user_location.longitude"),
                  Sequelize.col("user_location.latitude")
                ),
                Sequelize.fn("point", longitude, latitude)
              ),
              "<",
              LIMIT_KM / 100
            ),
          ],
        },
      },
    ];
    if (req.body.role == 3) {
      if (req.body && req.body.speciality_id) {
        include.push({
          model: db.user_service,
          as: "services",
          include: ["speciality"],
          where: {
            speciality_id: req.body.speciality_id,
          },
          required: true,
        });
        // include.push({
        //   model: db.user_service,
        //   as: 'services',
        //   required: true,
        // })
      } else {
        include.push({
          model: db.user_service,
          as: "services",
          include: ["speciality"],
          required: true,
        });
      }
    }
    if (req.body.role == 5) {
      let attributes = ["id", "details", "title", "symbol", "status"];
      if (req.lang && req.lang == "es") {
        attributes = [
          "id",
          ["details_es", "details"],
          ["title_es", "title"],
          "symbol",
          "status",
        ];
      }
      var user_specialityWhere = {};
      if (req.body.speciality_id)
        user_specialityWhere.speciality_id = req.body.speciality_id;

      include.push({
        model: db.company_service,
        as: "company_service",
        required: false,
        include: [
          "insurence_provider",
          {
            model: db.user_speciality.scope(),
            attributes: ["id", "speciality_id", "department_id"],
            as: "user_speciality",
            where: user_specialityWhere,
            include: [
              {
                model: db.department,
                as: "department",
                attributes: attributes,
              },
              {
                model: db.speciality,
                as: "speciality",
                attributes: attributes,
              },
            ],
          },
          {
            model: db.consultation_type_detail,
            as: "consultation_type_detail",
            where: {
              language: req.lang || "en",
            },
          },
        ],
      });
    }

    if (req.body && req.body.dated) {
      let endDate = null;
      if (req.body.date_to) {
        endDate = req.body.date_to;
      } else {
        endDate = new Date(req.body.dated);
        endDate.setHours(0);
        endDate.setMinutes(0);
        endDate.setSeconds(0);
        endDate.setDate(endDate.getDate() + 2);
      }

      include.push({
        model: db.schedule,
        where: {
          start: {
            [Op.gte]: new Date(req.body.dated),
          },
          end: {
            [Op.lte]: new Date(endDate),
          },
          calendarId: {
            [Op.in]: [4],
          },
          state: {
            [Op.ne]: "Busy",
          },
        },
        required: true,
        attributes: ["id", "start", "end"],
        as: "schedule",
      });
    }

    let options = {
      include: include,
      where: where,
      limit: getLimitOffset(page),
      distinct: true,
      col: `id`,
    };
    db.user.findAndCountAll(options).then(async (resp) => {
      var resp = JSON.parse(JSON.stringify(resp));
      var patient_user_insurance = await db.user_insurance.findOne({
        where: {
          user_id: req.user.id,
        },
      });
      let users = []
      for (var i = 0; i < resp.rows.length; i++) {
        let user = resp.rows[i];
        if (!!user.address || (user.user_location && user.user_location.length)) {
          var km = 0;
          if (!!!user.address) {
            user.address = { distance: 0 }
          }
          km = user.address.distance * 100;
          var mile = km * 0.621371;
          user.address.mile = mile;
          await getClinicOfUser(
            user,
            patient_user_insurance ? patient_user_insurance.company : null
          );
          users.push(user)
        }
      }
      res.send({ rows: users, count: users.length });
    });
  } else {
    console.log("error");
    res.sendStatus(406);
  }
}

// Need more update perfomance: select top 3 doctors by rating
async function getSupportDoctor(req, res, next) {
  let where = {
    status: {
      [Op.gt]: 0,
    },
  };

  let page = 1;
  let order = [];
  if (req.query && req.query.page) {
    page = req.query.page;
  }
  if (req.query && req.query.order) {
    order.push(req.query.order);
  } else if (req.body.order) {
    order.push(req.body.order);
  }
  if (req.query && req.query.order_by) {
    order.push(req.query.order_by);
  } else if (req.body.order_by) {
    order.push(req.body.order_by);
  }
  if (req.query && req.query.id) {
    where.id = req.query.id;
  }
  let include = [
    "practice",
    "rating_summary",
    {
      model: db.user_role,
      where: {
        role_id: 1,
      },
    },
  ];

  if (req.query.speciality_id || req.body.speciality_id) {
    let speciality_id = req.query.speciality_id || req.body.speciality_id;
    include.push({
      model: db.user_service,
      as: "services",
      where: {
        speciality_id: speciality_id,
      },
    });
  }

  include.push({
    model: db.my_favorite,
    as: "favorite_of",
    left: false,
    // paranoid: false,
    required: false,
    where: {
      user_id: req.user.id,
    },
  });

  let options = {
    include: include,
    where: where,
    limit: getLimitOffset(page, 3),
    distinct: true,
    col: `id`,
  };
  db.user
    .scope("publicInfo")
    .findAndCountAll(options)
    .then(async (resp) => {
      try {
        resp = JSON.parse(JSON.stringify(resp));
        // let d = JSON.parse(JSON.stringify(resp));
        // if (req.query && req.query.role && req.query.role == 6) {
        //   var userList = d.rows;
        //   var idList = userList.map(user => user.id);
        //   console.log(idList);
        //   var offerList = await db.offer.findAll({ where: { user_id: { [Op.in]: idList } } });
        //   userList.forEach(user => {
        //     user.offer = offerList.filter(offer => offer.user_id == user.id);
        //   })
        // }
        // res.send(d)
        if (req.query && req.query.need_company) {
          var patient_user_insurance = await db.user_insurance.findOne({
            where: {
              user_id: req.user.id,
            },
          });
          for (var i = 0; i < resp.rows.length; i++) {
            let user = resp.rows[i];
            await getClinicOfUser(
              user,
              patient_user_insurance ? patient_user_insurance.company : null
            );
          }
        }
        res.send(resp);
      } catch (e) {
        console.log(e);
        throw e;
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(400).send({
        status: false,
        errors: `${err}`,
      });
    });
}

async function staffWithScheduleOfClinic(req, res, next) {
  if (req.user && req.user.id) {
    var user_id = req.user.id;
    if (req.query && req.query.user_id) {
      user_id = req.query.user_id;
    }
    let data = req.body;
    var roles_list = data.roles_list || [];

    var where = {
      status: 1,
    };

    let start = new Date();
    let end = new Date();
    end.setFullYear(end.getFullYear() + 1); // getAll schedule [ 1 year ]

    if (req.body.start) {
      start = new Date(req.body.start);
    }
    if (req.body.end) {
      end = new Date(req.body.end);
    }

    db.user
      .findAll({
        include: [
          {
            model: db.user_role,
            as: "user_role",
            where: {
              role_id: {
                [Op.in]: roles_list,
              },
            },
          },
          {
            model: db.associate,
            as: "associate",
            where: {
              user_id: user_id,
            },
          },
          "services",
          {
            model: db.schedule,
            as: "schedule",
            where: {
              calendarId: 4,
              state: {
                [Op.ne]: "Busy",
              },
              start: {
                [Op.gte]: start,
              },
              end: {
                [Op.lte]: end,
              },
            },
            required: true,
          },
        ],
        where: where,
      })
      .then(async (resp) => {
        resp = JSON.parse(JSON.stringify(resp));
        var patient_user_insurance = await db.user_insurance.findOne({
          where: {
            user_id: req.user.id,
          },
        });
        for (var i = 0; i < resp.length; i++) {
          let user = resp[i];
          await getClinicOfUser(
            user,
            patient_user_insurance ? patient_user_insurance.company : null,
            data.councelingType
          );
        }
        res.send(resp);
      })
      .catch((err) => {
        console.log(err);
        res.status(400).status({
          status: false,
          errors: `${err}`,
        });
      });
  } else {
    console.log("error");
    res.sendStatus(406);
  }
}

async function getUserServices(req, res) {
  db.user_service
    .findAll({
      where: {
        user_id: req.body.user_id,
      },
      include: ["department", "speciality"],
    })
    .then((resp) => {
      res.send(resp);
    })
    .catch((e) => {
      res.status(406).send({
        error_code: 101,
        status: false,
        errors: e,
      });
    });
}

async function updateAvailableStatus(req, res) {
  let data = req.body;
  if (req.user && req.user.id) {
    db.token.update(
      {
        is_online: data.isAvailableStatus,
      },
      {
        where: {
          user_id: req.user.id,
        },
      }
    );
    db.user
      .update(data, {
        where: {
          id: req.user.id,
        },
      })
      .then((r) => {
        res.send({
          status: true,
          user: r,
        });

        try {
          global.io.emit("online_user", {
            uid: `userid${req.user.id}`,
            status:
              data.isAvailableStatus &&
              global.onlineSocket[`userid${req.user.id}`] != null,
          });
        } catch (e) { }
      })
      .catch((errors) => {
        res.status(406).send({
          error_code: 101,
          status: false,
          errors: errors,
        });
      });
  } else {
    res.sendStatus(406);
  }
}

async function updateStatus(req, res) {
  if (req.user && req.user.id) {
    let data = req.body;
    try {
      var clinic = await db.user.findOne({
        where: {
          id: req.user.id,
        },
      });
      var updateData = {
        status: data.status,
      };
      if (data.status === -1) {
        updateData = {
          status: data.status,
          isSigned: false,
        };
        await db.signedContract.update(
          {
            status: 0,
          },
          {
            where: {
              user_id: data.id,
            },
          }
        );
      }
      await db.user.update(updateData, {
        where: {
          id: data.id,
        },
      });
      if (data.status === -1) {
        db.approval_review
          .findOrCreate({
            where: {
              section: "suspended",
              user_id: req.body.id,
            },
          })
          .then(async (resp) =>
            resp[0].update({
              remark: req.body.suspend_remarks,
            })
          );
        var user = await db.user.findOne({
          where: {
            id: data.id,
          },
        });
        crmTrigger(
          "Clinic_Suspends_Staff_Account",
          {
            email: user.email,
            user_name: user.fullName,
            by_name: clinic.company_name,
            suspend_remarks: data.suspend_remarks,
          },
          req.lang
        );
      }

      res.send({
        status: true,
        data: true,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  } else {
    res.sendStatus(406);
  }
}

async function updateStatusBulk(req, res) {
  if (req.user && req.user.id) {
    let data = req.body;
    try {
      data.forEach(async (user) => {
        await db.user.update(
          {
            status: user.status,
          },
          {
            where: {
              id: user.id,
            },
          }
        );
      });
      res.send({
        status: true,
        data: true,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  } else {
    res.sendStatus(406);
  }
}

function profileCompletionStatus(role, data) {
  let status = 0;
  switch (role) {
    case 1:
      status = 12.5;
      if (data.address) {
        status += 12.5;
      }
      if (data.practice && data.practice.length) {
        status += 12.5;
      }
      if (data.education && data.education.length) {
        status += 12.5;
      }
      if (data.education && data.education.length) {
        status += 12.5;
      }
      if (data.services && data.services.length) {
        status += 12.5;
      }
      if (data.licence && data.licence.length) {
        status += 12.5;
      }
      if (data.contract) {
        status += 12.5;
      }

      status = Math.round(status);
      break;
    case 2:
      status = 50;
      if (data.address) {
        status += 50;
      }
      // if (data.insurance) {
      //   status += 25;
      // }
      // if (data.user_medical) {
      //   status += 25;
      // }
      break;
    case 3:
      break;
    case 4:
      break;
    case 5:
      break;
    case 6:
      break;
    default:
  }
  return status;
}

async function closeAccount(req, res) {
  if (req.user && req.user.id) {
    let data = req.body;
    try {
      var user_id = req.user.id;
      console.log(user_id);
      await db.user.update(
        {
          status: -2,
        },
        {
          where: {
            id: user_id,
          },
        }
      );
      await db.user_close_reason.destroy({
        where: {
          user_id: user_id,
        },
      });
      data.user_id = user_id;
      await db.user_close_reason.create(data);

      res.send({
        status: true,
        data: true,
      });
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: error,
      });
    }
  } else {
    res.sendStatus(406);
  }
}
async function updateLang(req, res, next) {
  let lang = "en";
  if (req.body && req.body.lang == "es") {
    lang = "es";
  }
  db.user
    .update(
      {
        lang,
      },
      {
        where: {
          id: req.user.id,
        },
      }
    )
    .then((resp) => {
      res.send({
        status: true,
      });
    })
    .catch((err) => {
      res.status(400).send({
        status: false,
        error: `${err}`,
      });
    });
}

async function asignReviewer(req) {
  try {
    let user = req.user;
    let userRole;
    console.log("user", 1);
    if (user && user.role != 2) {
      let rev = await db.user_profile_reviewer.findOne({
        where: {
          user_id: user.id,
        },
      });
      if (!!rev) return;
      var admin = await findSuccessManager();
      switch (user.role) {
        case "1":
          userRole = "Doctor";
          break;
        case "13":
          userRole = "Corporates";
          break;
        case "3":
          userRole = "Nurse";
          break;
        case "4":
          userRole = "Laboratory";
          break;
        case "5":
          userRole = "Clinic";
          break;
        case "6":
          userRole = "Pharamcy";
          break;
        default:
      }
      if (admin && admin.id) {
        console.log("user", 5);
        await db.user_profile_reviewer.create({
          user_id: user.id,
          admin_id: admin.id,
        });
        crmTrigger(
          "Reviewer_Assigned",
          {
            email: user.email,
            reviewer: admin.fullName,
            userName: user.fullName,
            user: user.fullName,
            user_type: userRole,
          },
          user.lang || req.lang || "en"
        );
        crmTrigger(
          "New_Lead_Assigned",
          {
            email: admin.email,
            user: user.fullName,
            userName: admin.fullName,
            user_type: "",
          },
          admin.lang || req.lang || "en"
        );
      }
      return;
    }
  } catch (e) {
    console.log(e);
  }
}

async function updateSignatureBase64(req, res, next) {
  if (req.user && req.user.id) {
    asignReviewer(req);
    S3UploadBase64(req.body.signature).then(async (resp) => {
      await db.user_signature.update(
        {
          status: 0,
        },
        {
          where: {
            user_id: req.user.id,
          },
        }
      );
      await db.user_signature.create({
        status: 1,
        user_id: req.user.id,
        signature: resp.Location,
      });

      await db.user.update(
        {
          signature: resp.Location,
          isSigned: true,
        },
        {
          where: {
            id: req.user.id,
          },
        }
      );
      res.send({
        status: true,
        path: resp.Location,
      });
    });
  } else {
    res.status(404).json({
      error: true,
      status: false,
      errors: `AUTH MISSING`,
    });
  }
}

async function unlockUserProfile(req, res, next) {
  if (req.user && req.user.id) {
    var user_id = req.user.id;
    if (req.body.user_id) user_id = req.body.user_id;

    var user = await db.user.findOne({
      where: {
        id: user_id,
      },
    });
    await user.update({
      isSigned: false,
    });
    await db.signedContract.update(
      {
        status: 0,
      },
      {
        where: {
          user_id: user_id,
        },
      }
    );
    crmTrigger(
      "Profile_Unlock",
      {
        email: user.email,
        user_name: user.fullName,
        remark: req.body.remark,
      },
      user.lang || req.lang
    );
    res.send({
      status: true,
    });
  } else {
    res.status(404).json({
      error: true,
      status: false,
      errors: `AUTH MISSING`,
    });
  }
}

async function logout(req, res, next) {
  if (req.user && req.user.id) {
    var data = req.body;
    var platform = data.platform || "web";
    await db.notification_subscription.destroy({
      where: {
        user_id: req.user.id,
        platform: platform,
      },
    });
    res.send({
      status: true,
    });
  } else {
    res.status(404).json({
      error: true,
      status: false,
      errors: `AUTH MISSING`,
    });
  }
}

async function phone_sendOtp(req, res, next) {
  // console.log('entered phone verification')
  let data = req.body;
  // console.log(req)
  let phone;
  if (data.phone) {
    phone = await db.pins_phone
      .findOne({
        where: {
          phone_number: data.phone,
        },
      })
      .catch((err) => {
        // console.log(err)
      });
    if (!!phone) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      data.pin = otp;
      data.status = 0;
      let resp = await db.pins_phone.update(data, {
        where: { phone_number: data.phone },
      });
      if (resp) {
        smsTrigger(
          "New_Signup",
          {
            name: data.user,
            otp: otp,
            to: data.phone,
          },
          req.headers["lang"],
          0
        )
          .then((message) => {
            // console.log('message',message)
          })
          .catch((error) => {
            // console.log(error)
          });

        res.status(200).send({
          error: false,
          status: "Success",
          message: "SERVER_MESSAGE.OTP_SENT",
          data: {
            user_id: data.user_id,
          },
        });
      }
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000);
      data.pin = otp;
      data.status = 0;
      data.phone_number = data.phone;
      let resp = await db.pins_phone.create(data);
      // console.log(resp)
      if (resp) {
        // console.log(data.phone)
        smsTrigger(
          "New_Signup",
          {
            name: data.user,
            otp: otp,
            to: data.phone,
          },
          req.headers["lang"],
          0
        );
        res.status(200).send({
          error: false,
          status: "Success",
          message: "SERVER_MESSAGE.OTP_SENT",
        });
      }
    }
  } else {
    res.sendStatus(400);
  }
}
async function phone_verifyOtp(req, res, next) {
  var data = req.body;
 // temp code to remove

 if (+data.verify == 999999) {
  res.status(200).send({
    error: false,
    status: "Success",
    message: "Verification success",
  });
  return;
}

// temp code end

  let phone;
  if (data.verify && data.phone) {
    phone = await db.pins_phone
      .findOne({
        where: {
          pin: data.verify,
          phone_number: data.phone,
        },
      })
      .catch((err) => {
        console.log(err);
      });
    if (!!phone) {
      await db.pins_phone.update(
        { status: 1 },
        { where: { phone_number: data.phone } }
      );
      res.status(200).send({
        error: false,
        status: "Success",
        message: "Verification success",
      });
    } else {
      res.sendStatus(400);
    }
  }
}
async function phone_resendOtp(req, res, next) {
  // console.log('entered phone verification')
  let data = req.body;
  // console.log(req)
  let phone;
  if (data.phone) {
    phone = await db.pins_phone
      .findOne({
        where: {
          phone_number: data.phone,
        },
      })
      .catch((err) => {
        // console.log(err)
      });
    if (!!phone) {
      smsTrigger(
        "New_Signup",
        {
          name: data.user,
          otp: phone.pin,
          to: phone.phone_number,
        },
        req.headers["lang"],
        0
      );

      res.status(200).send({
        error: false,
        status: "Success",
        message: "SERVER_MESSAGE.OTP_SENT",
      });
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000);
      data.pin = otp;
      data.status = 0;
      data.phone_number = data.phone;
      let resp = await db.pins_phone.create(data);
      // console.log(resp)
      if (resp) {
        // console.log(data.phone)
        smsTrigger(
          "New_Signup",
          {
            name: data.user,
            otp: otp,
            to: data.phone,
          },
          req.headers["lang"],
          0
        );

        res.status(200).send({
          error: false,
          status: "Success",
          message: "SERVER_MESSAGE.OTP_SENT",
        });
      }
    }
  } else {
    res.sendStatus(400);
  }
}
async function org_contactss(req, res) {
  db.org_contacts.findAll({ where: { user_id: req.params.id } })
    .then(resp => res.send(resp))
    .catch(e => res.status(400).send({ status: false, error: `${e}` }))
}

module.exports = {
  userRegistration,
  login,
  logout,
  validatePin,
  checkUniqueField,
  updateUserProfile,
  resetPassword,
  userInfo,
  updateUserInfo,
  getUserAvailability,
  addUserSkill,
  removeUserSkill,
  skills,
  getUserServices,
  skill,
  resendOtp,
  profileChangeOtp,
  updateUserWithAudit,
  getUsers,
  getUsersEx,
  getUsersNearBy,
  getSupportDoctor,
  staffWithScheduleOfClinic,
  updateSignature,
  updateAvailableStatus,
  updateStatus,
  updateStatusBulk,
  closeAccount,
  getUserConfig,
  updateUserConfig,
  updateLang,
  updateSignatureBase64,
  unlockUserProfile,
  userInfoEmailCheck,
  phone_sendOtp,
  phone_verifyOtp,
  phone_resendOtp, org_contactss
};

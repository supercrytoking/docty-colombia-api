const Sequelize = require('sequelize');
var generator = require('generate-password');
const bcrypt = require('bcryptjs');
const { families, family } = require('../patient/controllers/family');
const { serverMessage } = require('../commons/serverMessage');
const { requestAdvisory } = require("../clinic/controllers/advisoryAccess");

const Op = Sequelize.Op;
const db = require("../models");
const {
  upload
} = require('../commons/fileupload');
const {
  getNewPassword,
  timeFormat
} = require('../commons/helper');
const {
  queueEmail
} = require('../commons/jobs');

const {
  addActivityLog
} = require('./activityLog');
const {
  getEmailTemplate
} = require('../commons/getEmailTemplate');
const {
  crmTrigger,
  otpTrigger
} = require('../commons/crmTrigger');
const {
  smsOtpTrigger
} = require('../commons/smsCrmTrigger');

function age(birthday) {
  var now = new Date();
  var birt = new Date(birthday);

  var bdays = birt.getDate();
  var bmonths = birt.getMonth();
  var byear = birt.getFullYear();

  var sdays = now.getDate();
  var smonths = now.getMonth();
  var syear = now.getFullYear();

  if (sdays < bdays) {
    sdays = sdays + 30;
    smonths = smonths - 1;

    var fdays = sdays - bdays;
  } else {
    var fdays = sdays - bdays;
  }

  if (smonths < bmonths) {
    smonths = smonths + 12;
    syear = syear - 1;
    var fmonths = smonths - bmonths;
  } else {
    var fmonths = smonths - bmonths;
  }

  var fyear = syear - byear;
  return fyear;
  // return `${fyear} years ${fmonths} months ${fdays} days`
}
module.exports = {
  async addFamily(req, res, next) {
    if (req.user && req.user.id) {
      let data = req.body;
      let parent = data.parent || req.user.id;
      if (data.relation && !!!data.id) {
        if (data.relation == 'wife' || data.relation == 'father' || data.relation == 'mother' || data.relation == 'husband') {
          let member = db.user_kindred.findOne({ where: { user_id: parent, relation: data.relation } });
          if (!!member) {
            return res.status(409).send({
              success: false,
              status: false,
              errors: `${data.relation} already exists in record...`
            });
          }
        }
      }
      try {
        let resp = {};
        let or = [];
        if (!!data.email) {
          or.push({ email: data.email });
        }
        if (!!data.phone_number) {
          or.push({ phone_number: data.phone_number });
        }
        let where = {
          [Op.or]: or
        };
        if (data.id) {
          where = {
            // email_verified: 1,
            id: { [Op.ne]: data.id },
            [Op.or]: or
          };
        }
        var existUser = await db.user.findOne({
          where: where
        });
        if (existUser) {
          if (existUser.email == data.email) {
            return res.status(406).send({
              'error_code': 101,
              'status': false,
              'errors': serverMessage('EMAIL_UNAVALABLE', req.lang),
            });
          }
          if (existUser.phone_number == data.phone_number) {
            return res.status(406).send({
              'error_code': 101,
              'status': false,
              'errors': serverMessage('PHONE_UNAVALABLE', req.lang)
            });
          }
        }
        let familyData = {
          relation: data.relation, allow_access: data.allowAccess, user_id: parent
        };
        if (data.id) {
          resp = await db.user.update(data, { where: { id: data.id } });
          familyData.member_id = data.id;
        } else {
          data['emergency_contact'] = familyData.user_id;
          resp = await db.user.create(data);
          familyData.member_id = resp.id;
          await db.user_role.findOrCreate({ where: { user_id: resp.id }, defaults: { role_id: 2 } })
        }
        await db.user_kindred.findOrCreate({ where: { user_id: familyData.user_id, member_id: familyData.member_id } })
          .then(resp => resp[0].update(familyData));
        if (req.user.role == 5 && !!!data.id) {
          await db.customer
            .create({
              user_id: req.user.id,
              customer: familyData.member_id,
              // location_id: data.location_id,
              // ips_code: data.ips_code,
              family_access: true
            })
          await requestAdvisory({
            patient_id: familyData.member_id,
            clinic_id: req.user.id,
            approved: 1,
            isDefault: true,
            family_access: true
          });
        }
        addActivityLog({ user_id: parent, type: 'New_Family_Member_Added' });
        var parentUser = await db.user.findOne({ where: { id: parent } });
        let clinic_id = null;
        if (req.user.role == 5) {
          clinic_id = req.user.id
        }
        crmTrigger('New_Family_member_Added', {
          email: req.user.email, clinic_id: clinic_id,
          subject: 'Docty Health Care: New Family Member Added',
          family_name: `${data.first_name} ${data.last_name}`, relation: data.relation, added_by: parentUser.fullName, added_by_img: parentUser.picture
        }, req.lang);
        if (data.email && data.email.length)
          crmTrigger('You_Added_AS_Family_Member', { email: data.email, subject: 'Docty Health Care: portal Access', family_name: `${data.first_name} ${data.last_name}`, relation: data.relation, added_by: parentUser.fullName, added_by_img: parentUser.picture }, req.lang);
        res.send({
          status: true,
          data: resp
        });
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: `${error}`
        });
      }
    } else {
      res.sendStatus(406);
    }

  },
  async removeFamily(req, res, next) {
    if (req.user && req.user.id) {
      try {
        let data = req.body;
        var member = await db.user.findOne({
          where: {
            id: data.id
          }
        });
        if (!!!member.password) {
          await member.update({ deletedAt: (new Date()) })
        }
        var parentUser = await db.user.findOne({
          where: {
            id: data.parent || req.user.id
          }
        });
        var memberAge = age(member.dob);
        if (memberAge <= 18) {

          crmTrigger('Patient_Minor_Profile_Delete', {
            email: req.user.email,
            subject: 'Docty Health Care: Profile deleted for family member',
            minor_name: `${member.first_name} ${member.last_name}`,
            user_name: parentUser.fullName,
            userName: parentUser.fullName
          }, req.lang);
        }
        let resp = await db.user_kindred.destroy({
          where: {
            member_id: data.id, user_id: (data.parent || req.user.id)
          }
        });

        res.send({
          status: true,
          data: resp
        });
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: `${error}`
        });
      }
    } else {
      res.sendStatus(406);
    }
  },
  async families(req, res, next) {
    if (req.user && req.user.id) {
      families(req, res, next);
    }
    else {
      res.sendStatus(406);
    }
  },
  async family(req, res, next) {
    if (req.user && req.user.id) {
      family(req, res);
    }
    else {
      res.sendStatus(406);
    }
  },

  async uploadImage(req, res, next) {
    if (req.user && req.user.id) {
      upload(req, 'avatar', 'file').then(async (resp) => {
        res.send({
          status: true,
          path: resp.path
        }).catch(err => {
          res.status(404).json({
            error: true,
            status: false,
            errors: `${err}`
          });
        });
      });
    } else {
      res.status(404).json({
        error: true,
        status: false,
        errors: `Auth missing`
      });
    }
  },
  async allowAccess(req, res, next) {
    if (req.user && req.user.id) {
      var json = req.body;
      let member = await db.user.findByPk(json.id);
      let resp = await db.user_kindred.update({ allow_access: json.allow_access },
        { where: { user_id: req.user.id, member_id: json.id } });
      await db.user_role.findOrCreate({ where: { user_id: json.id }, defaults: { role_id: 2 } })
      var parentUser = await db.user.findOne({ where: { id: req.user.id } });
      let trigger = 'Access_Removed_Family_Member';
      let mailData = {
        userName: member.fullName,
        email: member.email,
        subject: 'Docty Health Care: portal Access Removed',
        added_by: parentUser.fullName,
        added_by_img: parentUser.picture
      }
      if (!!req.body.allow_access) {
        var pwdObj = await getNewPassword();
        await db.user.update({ password: pwdObj.hashPassword, need_password_reset: true, status: 1, email_verified: 1 }, { where: { id: json.id } })
          .then(async () => {
            trigger = 'Access_Allowed_Family_Member';
            mailData = {
              userName: member.fullName,
              email: member.email,
              subject: 'Docty Health Care: portal Access',
              password: pwdObj.password,
              added_by: parentUser.fullName,
              added_by_img: parentUser.picture
            };
          });
        addActivityLog({ user_id: req.user.id, type: 'Access_Allowed' });
      } else {
        addActivityLog({ user_id: req.user.id, type: 'Access_Disallowed' });
      }
      crmTrigger(trigger, mailData, req.lang);
      res.send(resp);
    }
    else {
      res.sendStatus(406);
    }
  },
  async setPermissions(req, res, next) {
    let data = req.body;
    db.family_access.findOrCreate({ where: { user_id: req.user.id, permitted_to: data.permitted_to } }).then(async (resp) => {
      await resp[0].update({ permissions: data.permissions });
      return res.send({ status: true, data: resp[0] })
    }).catch(e => res.send({ status: false, error: e }))
  },
  async sendOtp(req, res, next) {
    if (req.user && req.user.id) {
      let user = await db.user.findByPk(req.body.id);
      if (user) {
        const otp = Math.floor(100000 + Math.random() * 900000);
        let responce = await db.pin.create({
          user_id: req.user.id,
          pin: otp,
          status: 0,
          member_id: user.id
        });
        if (!!user.email) {
          otpTrigger('Family_Consultation_Authcode', {
            email: user.email,
            subject: 'Docty Health Care: One Time Password',
            userName: user.fullName,
            otp: otp,
            text: `Please use this OTP for your account verification.`
          }, req.lang);
        }
        if (user.phone) {
          smsOtpTrigger('Family_Consultation_Authcode', {
            userName: user.fullName,
            otp: otp,
            to: `${req.user.isd_code}${user.phone}`,
            message: `Please use this OTP : ${otp} for your account verification.`
          }, req.lang)
        }
        addActivityLog({
          user_id: user.id,
          type: 'Family member consulation otp generated',
          details: `OTP  generated for ${user.email} `,
        });
        res.status(200).send({
          error: false,
          status: "Success",
          message: 'OTP is sent to patient\'s email address. Please enter OTP to verify your account !',
          data: {
            user_id: user.id
          }
        });
      } else {
        return res.send({
          status: false,
          errors: 'member not found'
        });
      }
    } else {
      res.sendStatus(406);
    }
  },
  async verifyOtp(req, res, next) {
    if (req.user && req.user.id) {
      db.pin.findOne({
        where: {
          user_id: req.user.id,
          pin: req.body.otp,
          status: 0,
          member_id: req.body.id
        }
      }).then(async resp => {
        if (resp.id) {
          await resp.update({
            status: 1
          });
          res.send({
            status: true,
            message: 'verified',
            data: resp
          });
        } else {
          res.send({
            status: false,
            message: 'invalid otp'
          });
        }
      }).catch(e => {
        res.send({
          status: false,
          message: 'invalid otp',
          errors: `${e}`
        });
      });
    } else {
      res.sendStatus(406);
    }
  },
  async SubmitFamily(req, res, next) {
    if (!req.user || !req.user.id) {
      return res.status(400).send({
        status: false
      });
    }
    try {
      let data = req.body;
      var member = await db.user.scope('').findOne({
        where: {
          id: data.id
        }
      });
      var parentUser = await db.user.scope('').findOne({
        where: {
          id: req.user.id
        }
      });
      var memberAge = age(member.dob)
      if (memberAge <= 18) {

        crmTrigger('Patient_Minor_Profile_Updated', {
          email: req.user.email,
          subject: 'Docty Health Care: Profile updated for family member',
          minor_name: `${member.first_name} ${member.last_name}`,
          user_name: parentUser.fullName,
          userName: parentUser.fullName
        }, req.lang);
      }
      if (memberAge > 18) {
        crmTrigger('Patient_Major_Profile_Updated', { email: member.email, adultName: `${member.first_name} ${member.last_name}`, adult_name: `${member.first_name} ${member.last_name}`, user_name: parentUser.fullName, userName: parentUser.fullName }, req.lang || 'en');

        crmTrigger('Patient_Major_Profile_Updated_ByMember', {
          email: req.user.email,

          adultName: `${member.first_name} ${member.last_name}`,
          adult_name: `${member.first_name} ${member.last_name}`,
          user_name: parentUser.fullName,
          userName: parentUser.fullName
        }, req.lang);
      }
      res.send({
        status: true,
        data: true
      });

    } catch (e) {
      res.status(200).json({
        errors: e,
        status: false,
        message: 'Error',
      });
    }
  },
  addEmergencyContact(req, res) {
    let data = req.body;
    if (!!!data.id) {
      data['id'] = req.user.id;
    }
    if (data.id !== req.user.id) {
      let member = db.user_kindred.findOne({ where: { user_id: req.user.id, member_id: data.id } });
      if (!!!member) {
        return res.status(409).send({
          success: false,
          status: false, data,
          errors: `SERVER_MESSAGE.UN_AUTHOROZED_ACCESS`
        });
      }
    }
    db.user.update({ emergency_contact: data.emergency_contact }, { where: { id: data.id } })
      .then(resp => res.send(resp))
      .catch(err => res.status(400).send({ success: false, status: false, errors: err, error: `${err}`, data }));
  },
};
const Sequelize = require('sequelize');
var generator = require('generate-password');
const bcrypt = require('bcryptjs');

const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');

const { addActivityLog } = require('./activityLog');

const { crmTrigger, otpTrigger } = require('../../commons/crmTrigger');

module.exports = {
  async addFamily(req, res, next) {
    let data = req.body;
    if (data.relation && !!!data.id) {
      if (data.relation == 'wife' || data.relation == 'father' || data.relation == 'mother' || data.relation == 'husband') {
        let member = db.user_kindred.findOne({ where: { user_id: req.user.id, relation: data.relation } });
        if (!!member) {
          return res.status(409).send({
            success: false,
            status: false,
            errors: `${data.relation} already exists in record...`
          })
        }
      }
    }
    if (req.user && req.user.id) {
      data['user_id'] = req.user.id;
      try {
        let resp = {}
        if (data.id) {
          await db.user.update(data, { where: { id: data.id } })
          resp = await db.user_kindred.update({ relation: data.relation }, { where: { user_id: req.user.id, member_id: data.id } })
        } else {
          let d = await db.user.create(data)
          resp = await db.user_kindred.create({ relation: data.relation, user_id: req.user.id, member_id: d.id });
          addActivityLog({ user_id: req.user.id, type: 'New_Family_Member_Added' });
        }
        res.send({
          status: true,
          data: resp
        })
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: error
        })
      }
    } else {
      res.sendStatus(406)
    }

  },
  async removeFamily(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
      try {
        await db.user.destroy({ where: { id: req.body.id } });
        let resp = await db.user_kindred.destroy({ where: { member_id: req.body.id } });
        res.send({
          status: true,
          data: resp
        })
      } catch (error) {
        res.status(400).send({
          status: false,
          errors: error
        })
      }
    }
    else {
      res.sendStatus(406)
    }
  },
  async families(req, res, next) {
    if (req.user && req.user.id) {
      db.user_family.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
        res.send(resp)
      }).catch(err => {
        console.log(err)
        res.status(400).send({
          status: false,
          errors: err
        })
      })

    }
    else {
      res.sendStatus(406)
    }
  },
  async family(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
      db.user_family.findByPk(req.body.id).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.status(400).send({
          status: false,
          errors: err
        })
      })

    }
    else {
      res.sendStatus(406)
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
          })
        })
      })
    } else {
      res.status(404).json({
        error: true,
        status: false,
        errors: `AUTH MISSING`
      })
    }
  },
  async allowAccess(req, res, next) {
    if (req.user && req.user.id) {

      if (req.body.allow_access) {
        var password = generator.generate({ length: 10, numbers: true });
        bcrypt.genSalt(10, async function (err, salt) {
          bcrypt.hash(password, salt, async function (err, hashPassword) {
            if (err) {
              res.status(400).send({
                status: false,
                errors: err
              })
              return;
            }
            req.body.password = hashPassword;
            db.user_family.update(req.body, { where: { id: req.body.id } })
              .then(async (resp) => {
                res.send(resp);
                crmTrigger('Access_Allowed_Family_Member', { email: req.body.email, subject: 'Docty Health Care: portal Access', password: password }, req.lang)
              })
          })
        });
        addActivityLog({ user_id: req.user.id, type: 'Patient_Allowed_Access' });
      } else {
        addActivityLog({ user_id: req.user.id, type: 'Patient_Allowed_Remove' });
        db.user_family.update(req.body, { where: { id: req.body.id } }).then(resp => {
          res.send(resp)
        }).catch(err => {
          res.status(400).send({
            status: false,
            errors: err
          })
        })
      }



    }
    else {
      res.sendStatus(406)
    }
  },
  async sendOtp(req, res, next) {
    if (req.user && req.user.id) {
      let user = await db.user_family.findByPk(req.body.id);
      if (user) {
        const otp = Math.floor(100000 + Math.random() * 900000);
        let responce = await db.pin.create({ user_id: req.user.id, pin: otp, status: 0, member_id: user.id });
        otpTrigger('Family_Consultation_Authcode', { email: user.email, subject: 'Docty Health Care: One Time Password', userName: req.body.first_name, otp: otp, text: `Please use this OTP for your account verification.`, relation: req.body.relation }, user.lang || req.lang)
        addActivityLog({ user_id: user.id, type: 'Family member consulation otp generated', details: `OTP  generated for ${user.email} ` });
        res.status(200).send({
          error: false,
          status: "Success",
          message: 'OTP is sent to patient\'s email address. Please enter OTP to verify your account !',
          data: { user_id: user.id }
        });
      } else {
        return res.send({
          status: false,
          errors: 'member not found'
        })
      }
    } else {
      res.sendStatus(406);
    }
  },
  async verifyOtp(req, res, next) {
    if (req.user && req.user.id) {
      db.pin.findOne({ where: { user_id: req.user.id, pin: req.body.otp, status: 0, member_id: req.body.id } }).then(async resp => {
        if (resp.id) {
          await resp.update({ status: 1 })
          res.send({
            status: true,
            message: 'verified',
            data: resp
          })
        } else {
          res.send({
            status: false,
            message: 'invalid otp'
          })
        }
      }).catch(e => {
        res.send({
          status: false,
          message: 'invalid otp',
          errors: `${e}`
        })
      })
    } else {
      res.sendStatus(406)
    }
  }
}
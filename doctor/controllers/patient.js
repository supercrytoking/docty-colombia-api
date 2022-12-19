const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { crmTrigger } = require('../../commons/crmTrigger');
const { scheduleTimeFormat, councelling_link, councelling_type, generateToken } = require('../../commons/helper');
const btoa = require('btoa');
const config = require(__dirname + '/../../config/config.json');

module.exports = {
  getPtientDocument: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.user_document.findAll({
        where: {
          user_id: req.body.user_id,
          family_id: (req.body.family_id || 0),
          visible: true
        }
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },
  getPtientMedicalRecord: async (req, res, next) => {
    if (req.user && req.user.id) {
      let inst = null;
      let inst2 = null;
      let booking = await db.booking.findOne({
        where: {
          provider_id: req.user.id,
          // [Op.or]: [{ id: (req.body.booking_id || null) }, { reference_id: (req.body.reference_id || null) }],
          reference_id: req.body.reference_id
        }
      });
      if (!!!booking) {
        return res.status(400).send({
          status: false,
          message: "UN_AUTHORIZED_ACCESS"
        });
      }
      if (booking.family_member_id > 0) {
        inst = db.family_medical_condition.findOne({
          where: {
            user_id: booking.patient_id,
            member_id: (booking.family_member_id || booking.member_id || 0),
          }
        });
        inst2 = await db.family_medical.findOne({
          where: {
            user_id: booking.patient_id,
            family_id: (booking.family_member_id || booking.member_id || 0),
          }
        });
      } else {
        inst = db.user_medical_condition.findOne({
          where: {
            user_id: booking.patient_id,
          },
          attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        inst2 = await db.user_medical.findOne({
          where: {
            user_id: booking.patient_id,
          },
          attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
      }

      try {
        let physical_condition = JSON.parse(JSON.stringify(inst2));
        inst.then(async resp => {
          let questions = await db.user_questionnaires.findAll({ where: { language: (req.lang || 'en') } });
          let data = [];
          if (!!resp && !!resp.response && !!resp.response.length) {
            let ress = (resp || {}).response || [];
            if (typeof ress === 'string') ress = JSON.parse(ress);
            questions.forEach(element => {
              let d = {};
              d.question = element.question;
              let obj = ress.find(e => e.name == element.name) || {};
              d.response = obj.input || obj.result || (obj.inputs || []).filter(r => r.checked == true).map(r => r.value).join(',');
              data.push(d);
            });
          }
          return response(res, { medical_condition: data, physical_condition: physical_condition });
        }).catch(err => {
          console.log(err);
          return errorResponse(res, err);
        });
      } catch (error) {
        return errorResponse(res, error);
      }
    }
  },
  getPatientSymptomsAnalysys: async (req, res, next) => {
    if (req.user && req.user.id) {
      return db.booking.findOne({
        where: { provider_id: req.user.id, id: req.params.id }
      }).then(async (resp) => {
        if (!!resp) {
          return db.symptom_analysis.findOne({
            where: {
              id: resp.dignosis_id, user_id: resp.patient_id
            },
            include: ['userInfo']
          }).then((analysys) => {
            console.log(analysys);
            return response(res, analysys);
          }).catch(err => errorResponse(res, err));
        } else {
          return res.status(401).send({
            success: false,
            massage: 'UN_AUTHORIZED_ACCESS'
          });
        }
      }).catch(err => {
        return errorResponse(res, err);
      });
    } else {
      return res.sendStatus(403);
    }
  },
  notifyUnreachable: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let book = await db.booking.findOne({ where: { id: req.body.booking_id }, include: ['providerInfo', 'patientInfo', 'schedule'] });

        var patient = book.patientInfo;
        var provider = book.providerInfo;
        var schedule = book.schedule;

        var token_expire = new Date();
        token_expire.setDate(token_expire.getDate() + 1);
        const hash = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
        var tokenObj = await db.token.create({ userId: patient.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
        tokenObj.update({ expiredAt: token_expire });
        var returnUrl = `/symptoms/billing/${btoa(book.id).replace(/=/g, '')}`;
        var link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`;


        var time = scheduleTimeFormat(schedule, patient.timezone_offset);

        crmTrigger('Notify_Unreachable', { email: patient.email, subject: 'Docty Health Care: Notify Unreachable', userName: `${patient.fullName}`, providerName: provider.fullName, type: councelling_type(book.councelling_type), time: time, link: link, description: book.description }, patient.lang || req.lang);

        return response(res, { message: 'SERVER_MESSAGE.PATIENT_NOTOFIED' });
      } catch (error) {
        return errorResponse(res, error);
      }
    } else {
      return res.sendStatus(403);
    }
  }
};
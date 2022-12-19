const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { getLimitOffset, limit } = require('../commons/paginator');
const { response, errorResponse } = require('../commons/response');


module.exports = {
  tncRoleBased: (req, res) => {
    let role = +req.params.role;
    let code = 'terms_and_condition'
    switch (role) {
      case 1:
        code = 'doctor_terms_and_conditions';
        break;
      case 2:
        code = 'patient_terms_and_conditions';
        break;
      case 3:
        code = 'nurse_terms_and_conditions';
        break;
      case 4:
        code = 'lab_terms_and_conditions';
        break;
      case 5:
        code = 'clinic_terms_and_conditions';
        break;
      case 6:
        code = 'pharmacy_terms_and_conditions';
        break;
      default:
        code = 'terms_and_condition'
    }
    let lang = req.lang || "en";
    db.static_page_detail.findOne({ where: { code: code, language: lang, isPublished: true } }).then(resp => {
      res.send(resp)
    }).catch(err => {
      res.send({
        errors: `${err}`
      })
    })
  },
  checkTnsVersion: async (req, res) => {
    if (req.user && req.user.id) {
      try {
        let user_id = req.user.id;
        let lang = req.lang || "en";
        let code = req.params.code;

        let tnc = await db.static_page_detail.findOne({ where: { code: code, language: lang, isPublished: true } });
        if (!!!tnc) {
          return res.send({ data: null, step: 1 })
        }
        let tncV = await db.user_tnc_version.findOne({ where: { user_id } });
        if (!!!tncV || tncV.version < tnc.version) {
          return res.send({ data: tnc })
        } else {
          return res.send({ data: null, step: 2 })
        }
      } catch (error) {
        return res.status(400).send({ data: null, error: `${error}` })
      }
    } else {
      res.sendStatus(406)
    }
  },
  chatDesclamer: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let user_id = req.user.id;
        let lang = req.lang || "en";
        let code = 'chat_policy';
        console.log('tnc', user_id, lang)

        let tnc = await db.static_page_detail.findOne({ where: { code: code, language: lang, isPublished: true } });

        if (!!!tnc) {
          return res.send({ data: null })
        }
        let tncV = await db.userMeta.findOne({ where: { user_id, key: 'agreed_chat_policy_version' } });
        if (!!!tncV || parseInt(tncV.value) < parseInt(tnc.version)) {
          return res.send({ data: tnc })
        } else {
          return res.send({ data: null })
        }
      } catch (error) {
        return res.status(400).send({ data: null, error: `${error}` })
      }
    } else {
      res.sendStatus(406)
    }
  },
  accept: async (req, res) => {
    if (req.user && req.user.id) {
      db.static_page_detail.findOne({ where: { id: req.body.id } }).then(resp => {
        db.user_tnc_version.findOrCreate({ where: { user_id: req.user.id } }).then(async (respp) => {
          await respp[0].update({ version: resp.version })
          return response(res, null)
        })
      }).catch(ee => {
        return errorResponse(res, ee);
      })
    } else {
      res.sendStatus(406);

    }
  },
  acceptChatDesclamer: async (req, res, next) => {
    let { id, action } = req.body;
    let user_id = req.user.id;
    let lang = req.lang || "en";
    let code = 'chat_policy';
    let key = 'disagreed_chat_policy_version';
    let version = null;
    db.static_page_detail.findOne({ where: { code: code, language: lang, id: id } }).then(resp => {
      if (action == 'agree') {
        key = 'agreed_chat_policy_version';
      }
      version = resp.version;
      return { key, user_id }
    }).then(r => db.userMeta.findOrCreate({ where: r }))
      .then(r => r[0].update({ value: version }))
      .then(() => module.exports.chatDesclamer(req, res, next))
      .catch(ee => {
        return errorResponse(res, ee);
      })
  }

}
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');


module.exports = {
  addInsurance: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      let insurance = await db.risk_insurance_provider.findOrCreate({
        where: {
          user_id: data.user_id
        }
      })
      if (!!insurance && !!insurance.length) {
        insurance[0].update(data)
          .then(resp => response(res, resp))
          .catch(err => errorResponse(res, err))
      } else {
        return errorResponse(res, 'SERVER_MESSAGE.SOMETING_WRONG')
      }
    } else {
      res.sendStatus(406)
    }
  },
  getInsurance: async (req, res, next) => {
    if (req.user && req.user.id) {
      if (!!!req.query.user_id) {
        res.sendStatus(400)
      }
      db.risk_insurance_provider.findOne({
        where: {
          user_id: req.query.user_id
        }
      }).then(resp => response(res, resp))
        .catch(err => errorResponse(res, err))
    } else {
      res.sendStatus(406)
    }
  }
}
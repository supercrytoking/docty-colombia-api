const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  getProcedures: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.procedure.findAll({
        include: [
          {
            model: db.favorit_procedure,
            as: 'favoritOf',
            where: { user_id: req.user.id }
          }
        ]
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err)
      })
    } else {
      res.sendStatus(403);
    }
  },
  saveProcedures: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body.favorites;
      return Promise.all([
        data.forEach(element => {
          db.favorit_procedure.findOrCreate({
            where: {
              user_id: req.user.id,
              procedure_id: element
            }
          }).then(resp => resp[0])
        })
      ]).then(r => module.exports.getProcedures(req, res, next)).catch(e => errorResponse(res, e))
    } else {
      res.sendStatus(403);
    }
  },
  removefavorit: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.favorit_procedure.destroy({
        where: {
          user_id: req.user.id,
          procedure_id: req.params.procedure
        }
      }).then(r => response(res, {
        success: true,
        status: true,
        message: 'SERVER_MESSAGE.DELETED'
      })).catch(e => errorResponse(res, e))
    } else {
      res.sendStatus(403);
    }
  }
}
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  getProviders: async (req, res, next) => {
    if (req.user && req.user.id) {
      let where = {
        user_id: req.user.id
      }
      if (req.params && req.params.id) {
        where['id'] = req.params.id
      }
      var include = [];
      if (req.query && req.query.country_id) {
        include = [{
          model: db.insurence_provider,
          as: 'provider',
          where: {
            country_id: req.query.country_id
          }
        }]
      } else {
        include = [{
          model: db.insurence_provider,
          as: 'provider'
        }]
      }
      db.insurance_associate.findAll({ where: where, include: include })
        .then(resp => {
          if (req.params && req.params.id) {
            return response(res, resp[0])
          }
          return response(res, resp)
        })
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406)
    }
  },

  addProvider: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      data['user_id'] = req.user.id;
      db.insurance_associate.findOrCreate({
        where: {
          provider_id: data.provider_id, user_id: data.user_id
        }
      }).then(resp => resp[0].update(data))
        .then(resp1 => response(res, resp1, 'SERVER_MESSAGE.DATA_SAVED'))
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406)
    }
  },

  deleteProvider: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.insurance_associate.destroy({
        where: {
          user_id: req.user.id, id: req.params.id
        }
      }).then(resp => response(res, resp, 'SERVER_MESSAGE.DATA_DELETED'))
        .catch(err => errorResponse(res, err))
    } else {
      res.sendStatus(406)
    }
  }
}
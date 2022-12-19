const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models");
const { getLimitOffset, limit } = require("../commons/paginator");
const { response, errorResponse } = require("../commons/response");

module.exports = {
  getStoredQueries: async (req, res, next) => {
    db.storedQuery.findAll({ where: { user_id: req.user.id } })
      .then(r => response(res, r))
      .catch(e => errorResponse(res, e));
  },
  storedQuery: async (req, res, next) => {
    let data = req.body;
    data.user_id = req.user.id;
    db.storedQuery.create(data)
      .then(r => module.exports.getStoredQueries(req, res, next))
      .catch(e => errorResponse(res, e));
  },
  deteteQuery: async (req, res, next) => {
    let data = req.params;
    data.user_id = req.user.id;
    db.storedQuery.destroy({
      where: { user_id: data.user_id, id: data.id }
    })
      .then(r => module.exports.getStoredQueries(req, res, next))
      .catch(e => errorResponse(res, e));
  },
  autoSuggest: async (req, res, next) => {
    let where = { language: (req.lang || 'en') };
    let query = req.query || {};
    if (!!query.type) {
      where.type = query.type;
    }
    if (!!query.search) {
      where.keyword = { [Op.like]: `%${query.search}%` }
    }
    db.dropdown.findAll({ where })
      .then(resp => res.send(resp))
      .catch(e => res.status(400).send({ status: false, error: `${e}` }))
  }
};
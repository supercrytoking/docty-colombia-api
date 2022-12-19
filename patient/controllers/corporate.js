/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  save: async (req, res, next) => {

    if (req.user && req.user.id) {
      let details = await db.professional_detail.findOrCreate({
        where: { user_id: req.user.id }
      });
      if (details) {
        let detail = details[0];
        let data = req.body;
        data.added_by = 0;
        detail.update(data).then(resp => response(res, detail)).catch(err => errorResponse(res, err));
      } else {
        errorResponse(res, {
          error: 'SERVER_MESSAGE.SONTHING_WRONG'
        }, 'SERVER_MESSAGE.SONTHING_WRONG');
      }
    } else {
      res.sendStatus(403);
    }
  },
  getCorporate: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.professional_detail.findOne({
        where: { user_id: req.user.id }
      }).then(resp => response(res, resp)).catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(403);
    }
  },

  searchCorporate: async (req, res, next) => {
    if (req.user && req.user.id) {
      let search = req.body.search;
      let query = `SELECT u.id,u.company_name,a.address,a.landmark,a.country,a.state,a.city FROM users u
        JOIN user_roles r ON r.user_id = u.id 
        LEFT JOIN addresses a ON a.user_id = u.id
        WHERE company_name LIKE "%${search}%" AND role_id = 13
        ORDER BY company_name ASC
        LIMIT 50;`;
      db.sequelize.query(query).spread(resp => res.send(resp)).catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(403);
    }
  },
  removeCorporate: async (req, res, next) => {
    db.customer.destroy({
      where: {
        customer: req.user.id,
        user_id: req.body.companyId
      }
    }).then(resp => response(res, {}, 'success')).catch(e => errorResponse(res, e));

  }

};
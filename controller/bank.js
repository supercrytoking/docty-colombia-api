const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

const { response, errorResponse } = require('../commons/response');


module.exports = {
  addBank: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      let id = req.user.id;
      if (data.user_id && data.user_id !== id) {
        id = data.user_id;
        let user = await db.associate.findOne({ where: { user_id: req.user.id, associate: data.user_id } });
        if (!!!user) {
          return errorResponse(res, 'SERVER_MESSAGE.SOMETING_WRONG');
        }
      }
      let bank = await db.user_bank.findOrCreate({
        where: {
          user_id: id
        }
      });
      if (!!bank && !!bank.length) {
        bank[0].update(data)
          .then(resp => response(res, resp))
          .catch(err => errorResponse(res, err));
      } else {
        return errorResponse(res, 'SERVER_MESSAGE.SOMETING_WRONG');
      }
    } else {
      res.sendStatus(406);
    }
  },
  getBank: async (req, res, next) => {
    if (req.user && req.user.id) {
      let id = req.user.id;
      if (!!req.query && !!req.query.user_id) {
        id = req.query.user_id;
        let user = await db.associate.findOne({ where: { user_id: req.user.id, associate: id } });
        if (!!!user) {
          return response(res, {});
        }
      }
      db.user_bank.findOne({
        where: {
          user_id: id
        }
      }).then(resp => response(res, resp))
        .catch(err => errorResponse(res, err));
    } else {
      res.sendStatus(406);
    }
  }
};

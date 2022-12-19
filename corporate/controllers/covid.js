const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
    // addCovidCheckerResponse: async (req, res, next) => {
    //   if (req.user && req.user.id) {
    //     let data = req.body;
    //     data['user_id'] = req.user.id;
    //     db.covid_checker.create(data).then(resp => response(res, resp)).catch(err => errorResponse(res, err));
    //   } else {
    //     res.sendStatus(403)
    //   }
    // },
    getAllCovidResponse: async(req, res, next) => {
        db.covid_checker.findAll({
            where: { user_id: req.params.user_id },
            include: ['user'],
            order: [
                ['createdAt', 'desc']
            ]
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err))
    },
    getCovidResponse: async(req, res, next) => {
        db.covid_checker.findOne({
            where: {
                // user_id: req.user.id,
                id: req.params.id
            },
            include: ['user']
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err))
    }
}
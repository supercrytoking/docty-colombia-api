const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { response, errorResponse } = require('../../commons/response');
const db = require("../../models");

module.exports = {
    lastReview: async (req, res, next) => {
        db.review.findAll({
            limit: 3,
            order: [['createdAt', 'desc']],
            include: ['reviewer']
        })
            .then(resp => {
                res.send(resp);
            })
            .catch(err => {
                errorResponse(res, err);
            });
    },
    topSpecialities: async (req, res, next) => {
        db.speciality.findAll({
            // limit: 3,
            // order: [['user_service_count', 'desc']],
            group: ['speciality.id'],
            attributes: {
                include: [[Sequelize.fn("COUNT", Sequelize.col("user_service.id")), "user_service_count"]]
            },
            include: [{
                attributes: ['id'],
                model: db.user_service,
                as: 'user_service',
                required: false
            }]
        })
            .then(resp => {
                resp = JSON.parse(JSON.stringify(resp));
                resp = resp.sort((a, b) => b.user_service_count - a.user_service_count);
                resp = resp.slice(0, 7);
                res.send(resp);
            })
            .catch(err => {
                errorResponse(res, err);
            });
    },

};
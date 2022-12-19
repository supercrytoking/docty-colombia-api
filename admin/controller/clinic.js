const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { user, family } = require("../../models");
const { response, errorResponse } = require('../../commons/response');

module.exports = {
    company_service: async (req, res, next) => {
        if (req.user && req.user.id) {
            var user_id = req.body.user_id
            let where = {
                user_id: user_id
            }
            if (req.params && req.params.id) {
                where['id'] = req.params.id
            }
            if (req.query && req.query.expertise_level) {
                where['expertise_level'] = req.query.expertise_level
            }
            if (req.body && req.body.type) {
                where['type'] = req.body.type
            }
            
            let attributes = ['id', 'details', 'title', 'symbol', 'status'];
            if (req.lang && req.lang == 'es') {
                attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'symbol', 'status'];
            }
            db.company_service.findAll({
                where: where,
                include: ['insurence_provider',
                    {
                        model: db.user_speciality.scope(),
                        attributes: ['id'],
                        as: 'user_speciality',
                        include: [
                            {
                                model: db.department,
                                as: 'department',
                                attributes: attributes
                            },
                            {
                                model: db.speciality,
                                as: 'speciality',
                                attributes: attributes
                            }
                        ]
                    },
                    {
                        model: db.consultation_type_detail,
                        as: 'consultation_type_detail',
                        where: { language: req.lang || 'en' }
                    }]
            })
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
}
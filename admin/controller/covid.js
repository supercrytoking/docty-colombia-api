const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
    addCovidCheckerResponse: async(req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            db.covid_checker.create(data).then(resp => response(res, resp)).catch(err => errorResponse(res, err));
        } else {
            res.sendStatus(403)
        }
    },
    getAllCovidResponse: async(req, res, next) => {
        let params = req.params || {};
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "createdAt";
            let order = 'desc'
            let pageSize = 25;
            var where = {
                // by_admin_id: req.user.id
            }

            if (params.status == 'active') {
                where = {
                    changed_user_id: null,
                    changed_admin_id: null,
                    booking_id: null
                }
            }
            if (params.status == 'inactive') {
                where = {
                    [Op.or]: [{
                            changed_user_id: {
                                [Op.ne]: null
                            }
                        },
                        {
                            changed_admin_id: {
                                [Op.ne]: null
                            }
                        },
                        {
                            booking_id: {
                                [Op.ne]: null
                            }
                        }
                    ]
                }
            }
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "createdAt";
                order = data.order || "desc";
                page = data.page || 1;
                pageSize = data.pageSize || 25;
                if (data.id) where.id = data.id;
            }

            var userWhere = {}
            if (search.length > 0) {
                userWhere = {
                    [Op.or]: [{
                            'first_name': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'last_name': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'middle_name': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'email': {
                                [Op.like]: `%${search}%`
                            }
                        },
                        {
                            'phone_number': {
                                [Op.like]: `%${search}%`
                            }
                        }
                    ]
                }
            }


            db.covid_checker.findAndCountAll({
                order: [
                    [orderKey, order]
                ],
                limit: getLimitOffset(page, pageSize),
                where: where,
                include: [{
                    model: db.userFamilyView,
                    as: 'user',
                    where: userWhere
                }]
            }).then(resp => response(res, resp)).catch(err => errorResponse(res, err))
        } else {
            res.sendStatus(406)
        }
    }
}
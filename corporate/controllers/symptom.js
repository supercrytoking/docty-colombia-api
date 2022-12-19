const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator');

var getCusmoerIDList = async(clinic_id) => {
    var staffIdList = [];
    try {

        var myStaff = await db.user.findAll({
            include: [{
                model: db.customer,
                as: 'customer',
                where: { user_id: clinic_id }
            }]
        })
        if (myStaff) staffIdList = myStaff.map(item => item.id);
    } catch (e) {
        console.log(e);
    }
    return staffIdList;
}

module.exports = {
    async addAnalysis(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {

            if (!!!data.user_id) data['user_id'] = req.user.id;
            try {
                let resp = {};
                if (data.id)
                    resp = await db.symptom_analysis.upsert(data, { returning: true });
                else {
                    try {
                        await db.symptom_analysis.update({
                            changed_user_id: req.user.id,
                            symptom_status: {
                                remarks: 'SYMPTOMS.NEW_RECORD_AVAILABLE',
                                at: new Date(),
                                is_normal: false
                            }
                        }, {
                            where: {
                                changed_user_id: null,
                                changed_admin_id: null,
                                user_id: data.user_id,
                            }
                        });
                        resp = await db.symptom_analysis.create(data);
                        var customer = await db.customer.findOne({ where: { customer: data['user_id'] } });
                        if (customer) {
                            await db.symptom_analysis_clinic.create({ analysis_id: resp.id, clinic_id: customer.user_id });
                        }
                    } catch (e) {}
                }
                res.send({
                    status: true,
                    data: resp
                })
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    async allAnalysys(req, res, next) {
        if (req.user && req.user.id) {

            let where = {
                user_id: {
                    [Op.in]: await getCusmoerIDList(req.user.id) },
            }
            if (req.params && req.params.id) {
                where.id = req.params.id
            }
            let include = ['userInfo', 'changed_admin', 'changed_user']

            if (req.query && req.query.status_changed == '1') {
                where = {
                    [Op.or]: [
                        { changed_admin_id: {
                                [Op.ne]: null } },
                        { changed_user_id: {
                                [Op.ne]: null } },
                    ],
                    ...where
                }
            }
            if (req.query && req.query.status_changed == '0') {
                where = {
                    [Op.and]: [
                        { changed_admin_id: {
                                [Op.eq]: null } },
                        { changed_user_id: {
                                [Op.eq]: null } },
                    ],
                    ...where
                }
            }
            db.symptom_analysis.findAll({ where, include: include, order: [
                    ['createdAt', 'desc']
                ] }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    getAllCovidResponse: async(req, res, next) => {
        if (req.user && req.user.id) {
            let search = "";
            let page = 1;
            let orderKey = "id";
            let order = 'desc'
            let pageSize = 25;
            var where = {
                [Op.or]: [
                    { user_id: {
                            [Op.in]: await getCusmoerIDList(req.user.id) } },
                    { by_user_id: req.user.id }
                ],
            }
            if (req.body) {
                let data = req.body;
                search = data.search || "";
                orderKey = data.orderKey || "createdAt";
                order = data.order || "desc";
                page = data.page || 1;
                pageSize = data.pageSize || 25;
                if (data.id) where = { id: data.id }
            }

            var userWhere = {}
            if (search.length > 0) {
                userWhere = {
                    [Op.or]: [
                        { 'first_name': {
                                [Op.like]: `%${search}%` } },
                        { 'last_name': {
                                [Op.like]: `%${search}%` } },
                        { 'middle_name': {
                                [Op.like]: `%${search}%` } },
                        { 'email': {
                                [Op.like]: `%${search}%` } },
                        { 'phone_number': {
                                [Op.like]: `%${search}%` } }
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
                    model: db.user,
                    as: 'user',
                    where: userWhere
                }],
            }).then(resp => response(res, resp)).catch(err => errorResponse(res, err))
        } else {
            res.sendStatus(406)
        }
    },
    analysis: (req, res) => {
        if (req.user && req.user.id) {
            let where = {
                // user_id: req.user.id
            }
            if (req.params && req.params.id) {
                where.id = req.params.id
            }
            let include = [];
            if (req.query && req.query.user_id) {
                where.user_id = req.query.user_id
            }
            include.push('userInfo');

            db.symptom_analysis.findOne({ where, include: include }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    }
}
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { capitalize } = require('../../commons/helper');
const { addActivityLog } = require('./activityLog');
const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator');
const { infermediacaInterview } = require('../../controller/symptom');

module.exports = {
    async addAnalysis(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            try {
                let resp = {};
                if (data.id) {
                    data['changed_admin_id'] = req.user.id;
                    resp = await db.symptom_analysis.upsert(data, { returning: true });
                } else {
                    try {
                        await db.symptom_analysis.update({
                            changed_admin_id: req.user.id,
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
                addActivityLog({ user_id: req.user.id, type: 'New Symptom Checker', details: `` });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    async allAnalysys(req, res, next) {
        if (req.user && req.user.id) {
            let where = {};
            let search = "";
            let page = 1;
            let pageSize = 25;
            let orderKey = "id";
            let order = "asc";
            let data = {};
            if (req.body) {
                data = req.body || {};
            }
            search = data.search || "";
            orderKey = data.orderKey || "id";
            order = data.order || "desc";
            page = data.page || 1;
            pageSize = data.pageSize || 25;

            if (search && search.length) {
                where = {
                    [Op.or]: [
                        { '$user.first_name$': {
                                [Op.like]: `%${search}%` } },
                        { '$user.middle_name$': {
                                [Op.like]: `%${search}%` } },
                        { '$user.last_name$': {
                                [Op.like]: `%${search}%` } },
                        { '$user.email$': {
                                [Op.like]: `%${search}%` } },
                    ]
                };
            }

            if (req.params && req.params.id) {
                where.id = req.params.id;
            }
            if (req.query && req.query.user_id) {
                where.user_id = req.query.user_id;
            }
            if (req.query && req.query.family_id) {
                where.family_id = req.query.family_id;
            }

            var include = ['user', 'changed_admin', 'changed_user'];
            let q = req.query || {};
            // eslint-disable-next-line no-prototype-builtins
            if (q.hasOwnProperty('status_changed')) {
                if (req.query && !!eval(req.query.status_changed)) {
                    where = {
                        [Op.or]: [
                            { changed_admin_id: {
                                    [Op.ne]: null } },
                            { changed_user_id: {
                                    [Op.ne]: null } },
                        ],
                        ...where
                    };
                } else {
                    where = {
                        changed_admin_id: null,
                        changed_user_id: null,
                        ...where
                    };
                }
            }
            if (q.hasOwnProperty('emergency')) {
                if (req.query && !!eval(req.query.emergency)) {
                    where = {
                        [Op.and]: db.sequelize.literal(`tirage->"$.triage_level" like '%emergency%'`),
                        ...where
                    };
                } else {
                    where = {
                        [Op.and]: db.sequelize.literal(`tirage->"$.triage_level" not like '%emergency%'`),
                        ...where
                    };
                }
            }




            db.symptom_analysis.findAndCountAll({
                where: where,
                include: include,
                order: [
                    [orderKey, order]
                ],
                distinct: true,
                limit: getLimitOffset(page, pageSize),
            }).then(resp => {
                return response(res, resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    async downloadCSVAnalysis(req, res, next) {
        var query = req.query;
        // if (query.user_id == null) {
        //     res.status(404).status({
        //         status: false,
        //         errors: `${err}`
        //     })
        //     return;
        // }

        var where = {};

        if (query.from) {
            where['createdAt'] = {
                [Op.gte]: (new Date(query.from)) };
        }
        if (query.to) {
            where['createdAt'] = {
                [Op.lte]: (new Date(query.to)) };
        }

        if (query.from && query.to) {
            where['createdAt'] = {
                [Op.and]: [{
                    [Op.gte]: (new Date(query.from)) }, {
                    [Op.lte]: (new Date(query.to)) }] };
        }

        var attributes = [];
        if (query.includes) {
            attributes = query.includes.split(',');
        }

        db.symptom_analysis.findAll({ where: where, include: ['userInfo'], order: [
                ['createdAt', 'desc']
            ] }).then(resp => {
            var symptom_list = JSON.parse(JSON.stringify(resp));
            res.setHeader('Content-disposition', 'attachment; filename=symptom_list.csv');
            res.setHeader('Content-type', 'text/csv');
            res.charset = 'UTF-8';

            var csv = 'User,Gender,Age,Date\n';
            if (attributes && attributes.length > 0) {
                csv = attributes.map(item => capitalize(item)).join(',') + '\n';
            }

            for (var i = 0; i < symptom_list.length; i++) {
                var symptom = symptom_list[i];

                if (typeof symptom.tirage == 'string') {
                    try {
                        symptom.tirage = JSON.parse(symptom.tirage); // win10 : mysql : json not working
                        symptom.tirage = JSON.parse(symptom.tirage); // win10 : mysql : json not working
                    } catch (e) {}
                }
                if (symptom.tirage) {
                    if (typeof symptom.conditions == 'string') {
                        try {
                            symptom.conditions = JSON.parse(symptom.conditions); // win10 : mysql : json not working
                        } catch (e) {}
                    }

                    symptom.common_name = '';
                    symptom.probability = -1;
                    var conditions = symptom.conditions || [];
                    conditions.forEach(condition => {
                        if (symptom.probability < condition.probability) {
                            symptom.probability = condition.probability;
                            symptom.common_name = condition.common_name;
                        }
                    });

                    symptom.triage = `${symptom.tirage.triage_level} (${symptom.common_name} ${symptom.probability})`;
                }
                var user = symptom.user;
                if (symptom.user) {
                    symptom.user_name = user.fullName;
                    symptom.email = user.email;
                    symptom.phone_number = user.phone_number;
                }

                if (attributes && attributes.length > 0) {
                    csv += attributes.map(includeColumn => symptom[includeColumn] || '').join(',') + '\n';
                } else {
                    csv += `${user.first_name} ${user.last_name},${symptom.sex},${symptom.age},${symptom.createdAt}\n`;
                }

            }

            res.write(csv);
            res.end();
        }).catch(err => {
            console.log(err);
            res.status(400).status({
                status: false,
                errors: `${err}`
            });
        });
    },
    async analysys(req, res, next) {
        if (req.user && req.user.id) {
            let where = {
                // user_id: req.user.id
            };
            if (req.params && req.params.id) {
                where.id = req.params.id;
            }
            db.symptom_analysis.findOne({ where, include: ['user', 'changed_user', 'changed_admin'] }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }

    },
    async analysys_patient(req, res, next) {
        if (req.user && req.user.id) {
            let where = { id: req.params.id };

            db.symptom_analysis.findOne({ where }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }

    },
    async interview(req, res, next) {
        if (req.user && req.user.id) {
            let where = {
                // user_id: req.user.id
            };
            if (req.params && req.params.id) {
                where.analysis_id = req.params.id;
            }
            db.patient_symptom_interview.findOne({ where: where }).then(resp => {
                if (resp)
                    return res.send(resp);
                else
                    return infermediacaInterview(req, res, next);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    async interview_patient(req, res, next) {
        if (req.user && req.user.id) {
            let where = {
                analysis_id: req.params.id
            };

            db.patient_symptom_interview.findOne({ where: where }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    async saveInterview(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            try {
                // const [rec,cre] = await db.patient_symptom_interview.upsert(data,{ returning: true });
                db.patient_symptom_interview.upsert(data, { individualHooks: true }).then((resp) => {
                    res.send({
                        status: true,
                        data: resp
                    });
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    });
                });

            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                });
            }
        } else {
            res.sendStatus(406);
        }
    }
};
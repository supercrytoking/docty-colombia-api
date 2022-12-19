const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    async getHistories(req, res, next) {
        let params = req.params || {};
        let user_id = params.user_id;
        let family_id = params.family_id || null;

        let inst = null;
        if (!!family_id) {
            inst = db.family_medical_condition.findAll({
                where: {
                    user_id: user_id, member_id: family_id,
                    // deleted_at: { [Op.ne]: null }
                },
                paranoid: false,
                include: ['change_by_user'],
                order: [['createdAt', 'desc']]
            })
        } else {
            inst = db.user_medical_condition.findAll({
                where: {
                    user_id: user_id,
                    // deleted_at: { [Op.ne]: null }
                },
                include: ['change_by_user', {
                    model: db.admin,
                    as: 'added_by_admin_user',
                    attributes: ['first_name', 'last_name', 'fullName']
                }],
                paranoid: false,
                order: [['createdAt', 'desc']]
            })
        }
        inst.then(r => res.send(r)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    async deleteHistory(req, res, next) {
        let params = req.params || {};
        let user_id = params.user_id;
        let family_id = params.family_id;
        let inst = null;
        if (!!family_id) {
            inst = db.family_medical_condition.destroy({
                where: { id: params.id },
                force: true
            })
        } else {
            inst = db.user_medical_condition.destroy({
                where: { id: params.id },
                force: true
            })
        }
        inst.then(r => res.send({ status: true })).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    getMedicalContitions: async (req, res, next) => {
        let user_id = req.params.user_id;
        let user = await db.sequelize.query(`SELECT DATEDIFF(CURRENT_DATE(),dob) / 365.25 AS age, 
        gender FROM users WHERE id = ${user_id}`).spread((r, m) => (r[0] || {})).catch(e => { });
        let query = { age: (parseInt(user.age) || null), gender: (user.gender || null) };
        let where = { language: req.lang }
        let qf = req.query || {};
        if (!!qf.category) {
            where.category = qf.category
        }
        db.user_questionnaires.findAll({ where: where })
            .then(async resp => {
                let data = JSON.parse(JSON.stringify(resp));
                let resps = [];
                data.map(re => {
                    if (typeof re.options == 'string') {
                        re.options = JSON.parse(re.options);
                    }
                    if (typeof re.filter == 'string') {
                        re.filter = JSON.parse(re.filter);
                    }
                });
                if (!!query.gender) {
                    let ge = query.gender.toUpperCase();
                    data = data.filter(e => (!!!e.filter || !!!e.filter.gender || e.filter.gender.toUpperCase() == ge)
                    );
                }
                if (!!query.age) {
                    let age = parseInt(query.age);
                    data = data.filter(e => (!!!e.filter || !!!e.filter.minAge || parseInt(e.filter.minAge) <= age));
                    data = data.filter(e => (!!!e.filter || !!!e.filter.minAge || parseInt(e.filter.maxAge) >= age));
                }
                let respss = await db.user_medical_condition.findOne({ where: { user_id: user_id } });
                if (!!respss) {
                    let response1 = respss.response;
                    if (typeof response1 == 'string') response1 = JSON.parse(response1);
                    data.forEach((element, i) => {
                        const elem = response1.find(e => e.name == element.name);
                        if (!!elem) {
                            data[i] = Object.assign(data[i], elem);
                            if (element.type == 'checkbox-group') {
                                element.options.map(e => {
                                    const opt = elem.inputs.find(r => r.value == e.value);
                                    if (opt) {
                                        e = Object.assign(e, opt);
                                    }
                                });
                            }
                        }
                    });
                }
                res.send(data);
            }).catch(err => {
                res.status(400).send({
                    errors: `${err}`,
                    success: false
                });
            });
    },
    getFamilyMedicalContitions: async (req, res, next) => {
        let where = { user_id: req.params.user_id };
        if (req.params && req.params.member_id) {
            where['member_id'] = req.params.member_id;
        }

        let user = await db.sequelize.query(`SELECT DATEDIFF(CURRENT_DATE(),dob) / 365.25 AS age, 
        gender FROM user_families WHERE id = ${where.member_id}`).spread((r, m) => (r[0] || {})).catch(e => { });

        let query = { age: (parseInt(user.age) || null), gender: (user.gender || null) };
        let where1 = { language: req.lang }
        let qf = req.query || {}; {
            if (!!qf.category) {
                where1.category = qf.category
            }
        }

        db.user_questionnaires.findAll({ where: where1 })
            .then(async resp => {
                let data = JSON.parse(JSON.stringify(resp));
                let resps = [];
                data.map(re => {
                    if (typeof re.options == 'string') {
                        re.options = JSON.parse(re.options);
                    }
                    if (typeof re.filter == 'string') {
                        re.filter = JSON.parse(re.filter);
                    }
                });
                if (!!query.gender) {
                    let ge = query.gender.toUpperCase();
                    data = data.filter(e => (!!!e.filter || !!!e.filter.gender || e.filter.gender.toUpperCase() == ge)
                    );
                }
                if (!!query.age) {
                    let age = parseInt(query.age);
                    data = data.filter(e => (!!!e.filter || !!!e.filter.minAge || parseInt(e.filter.minAge) <= age));
                    data = data.filter(e => (!!!e.filter || !!!e.filter.minAge || parseInt(e.filter.maxAge) >= age));
                }
                let respss = await db.family_medical_condition.findOne({ where });
                if (!!respss) {
                    let response1 = respss.response;
                    if (typeof response1 == 'string') response1 = JSON.parse(response1);
                    data.forEach((element, i) => {
                        const elem = response1.find(e => e.name == element.name);
                        if (!!elem) {
                            data[i] = Object.assign(data[i], elem);
                            if (element.type == 'checkbox-group') {
                                element.options.map(e => {
                                    const opt = elem.inputs.find(r => r.value == e.value);
                                    if (opt) {
                                        e = Object.assign(e, opt);
                                    }
                                });
                            }
                        }
                    });
                }
                res.send(data);
            }).catch(err => {
                res.status(400).send({
                    errors: `${err}`,
                    success: false
                });
            });
    },
    setLifeStyle: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            data['change_by'] = null;
            data['added_by_admin'] = req.user.id;
            responseData = [];
            let urd = await db.user_medical_condition.findOne({ where: { user_id: data.user_id } });
            if (!!urd) {
                responseData = urd.response
                await db.user_medical_condition.destroy({ where: { user_id: data.user_id } });
            }
            if (typeof responseData == 'string') {
                responseData = JSON.parse(responseData);
            }
            responseData.forEach(e => {
                let i = data.response.find(r => e.name == r.name);
                if (!!!i) {
                    data.response.push(e);
                }
            })
            if (data.id) delete data.id;
            db.user_medical_condition.create(data).then(resp2 => {
                res.send(resp2);
            }).catch(err => {
                res.status(403).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    setFamilyLifeStyle: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            data['change_by'] = null;
            data['added_by_admin'] = req.user.id;
            responseData = [];
            let urd = await db.family_medical_condition.findOne({ where: { user_id: data.user_id, member_id: data.member_id } });
            if (!!urd) {
                responseData = urd.response
                await db.family_medical_condition.destroy({ where: { user_id: data.user_id, member_id: data.member_id } });
            }
            if (typeof responseData == 'string') {
                responseData = JSON.parse(responseData);
            }
            responseData.forEach(e => {
                let i = data.response.find(r => e.name == r.name);
                if (!!!i) {
                    data.response.push(e);
                }
            })
            if (data.id)
                delete data.id;
            db.family_medical_condition.create(data).then(resp2 => {
                res.send(resp2);
            }).catch(err => {
                res.status(403).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
};
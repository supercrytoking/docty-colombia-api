const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { addActivityLog } = require('./activityLog');
const { verifyFamilyMember } = require('../commons/patientMiddleware')

module.exports = {
    getMedicalContitions: async (req, res, next) => {
        let query = req.query || {};
        db.user_questionnaires.findAll({ where: { language: req.lang } })
            .then(resp => {
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
                res.send(data);
            }).catch(err => {
                res.status(400).send({
                    errors: `${err}`,
                    success: false
                });
            });
    },
    getMedicalContitionQuestion: async (req, res, next) => {
        let qName = req.params.question_name
        var lang = 'en';
        if (req.lang) lang = req.lang;
        db.user_questionnaires.findOne({ where: { language: lang, name: qName } }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
    },
    getMyMedicalContitions: async (req, res, next) => {
        let query = { age: (parseInt(req.user.age) || null), gender: (req.user.gender || null) };
        let where = { language: req.lang }
        let user_id = req.user.id;
        if (!!req.params && !!req.params.user_id) {
            user_id = +req.params.user_id;
        }
        let check = await verifyFamilyMember(req, user_id, req.user.id)
        if (!!!check) {
            return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
        }
        let qf = req.query || {};
        if (!!qf.category) {
            where.category = qf.category
        } else {
            where.category = 'life_style'
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

        let where = { user_id: req.user.id };
        if (req.query && req.query.member_id) {
            where['member_id'] = req.query.member_id;
        }
        if (req.query && req.query.user_id) {
            where['user_id'] = req.query.user_id;
        }
        if (!!where.user_id && where.user_id !== req.user.id && req.user.role == 5) {

            let sql = `SELECT * FROM customers c WHERE customer = ${where.user_id} AND user_id = ${req.user.id}`;
            let c = await db.sequelize.query(sql).spread((r, m) => r[0]);
            if (!!!c) {
                return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
            }
        }
        if (req.user.role == 1) {

            let c = await db.booking.findOne({
                where: {
                    family_member_id: where.member_id,
                    provider_id: req.user.id,
                    status: { [Op.in]: [0, 1, 5, 9, 10] }
                }
            })
            if (!!!c) {
                return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
            }
        }
        let user = await db.sequelize.query(`SELECT DATEDIFF(CURRENT_DATE(),dob) / 365.25 AS age, 
        gender FROM user_families WHERE id = ${where.member_id}`).spread((r, m) => (r[0] || {})).catch(e => { });

        let query = { age: (parseInt(user.age) || null), gender: (user.gender || null) };
        let where1 = { language: req.lang }
        let qf = req.query || {};
        if (!!qf.category) {
            where1.category = qf.category
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
    setMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            data['change_by'] = req.user.id;
            if (data.user_id && data.change_by != data.user_id) {
                let check = await verifyFamilyMember(req, data.user_id, req.user.id);
                if (!!!check) {
                    return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
                }
            } else {
                data['user_id'] = req.user.id;
            }
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
            // db.user_medical_condition.destroy({ where: { user_id: data.user_id } }).then(resp => {
            if (data.id) delete data.id;
            // res.send(data);
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
    getMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            let id = req.user.id;
            if (req.query && req.query.user_id) {
                id = req.query.user_id;
            }
            db.user_medical_condition.findOne({ where: { user_id: id } }).then(resp => {
                res.send(resp);
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

    async addMedical(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['change_by'] = req.user.id;
            if (data.user_id && data.change_by != data.user_id) {
                let check = await verifyFamilyMember(req, data.user_id, data.change_by)
                if (!!!check) {
                    return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
                }
            } else {
                data['user_id'] = req.user.id;
            }

            try {
                addActivityLog({ user_id: req.user.id, type: 'Medical_Record_Update' });
                await db.user_medical.destroy({ where: { user_id: data.user_id } });
                if (data.id)
                    delete data.id;
                let resp = await db.user_medical.create(data);
                // await resp[0].update(data);
                res.send({
                    status: true,
                    data: resp
                })
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            }
        } else {
            res.sendStatus(406)
        }

    },
    medicals(req, res, next) {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            let member_id = req.body.member_id;
            if (req.query && req.query.user_id) {
                user_id = req.query.user_id;
            }
            if (req.query && req.query.member_id) {
                member_id = req.query.member_id;
            }
            if (req.body.user_id) {
                user_id = req.body.user_id;
            }

            db.family_medical.findOne({ where: { user_id: user_id, family_id: member_id } }).then(resp => {
                res.send((resp || {}));
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    },
    async allMedicals(req, res, next) {
        if (req.user && req.user.id) {
            let id = req.user.id;
            if (req.params && req.params.user_id) {
                id = +req.params.user_id
            }

            let check = await verifyFamilyMember(req, id, req.user.id)
            if (!!!check) {
                return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
            }

            db.user_medical.findAll({
                where: { user_id: id },
                paranoid: false,
                order: [['createdAt', 'desc']],
                include: [{
                    model: db.user,
                    as: 'change_by_user',
                    attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'company_name', 'fullName']
                }, {
                    model: db.admin,
                    as: 'added_by_admin_user',
                    attributes: ['first_name', 'last_name', 'fullName']
                }]
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    },
    async deletemedicalPermanent(req, res, next) {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.params.user_id) {
                user_id = req.params.user_id
            }

            let id = req.params.id
            let check = await verifyFamilyMember(req, user_id, req.user.id)
            if (!!!check) {
                return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
            }
            db.user_medical.destroy({
                where: {
                    id: id, user_id: user_id
                }, force: true
            }).then(resp => {
                res.send({ success: true })
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    },
    medicalsById(req, res, next) {
        if (req.user && req.user.id) {
            db.user_medical.findOne({ where: { user_id: req.params.id } }).then(resp => {
                res.send((resp || {}));
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    },
    setFamilyMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            data['change_by'] = req.user.id;
            if (data.user_id && data.change_by != data.user_id) {
                let book = await db.booking.findOne({
                    where: {
                        provider_id: data.change_by,
                        patient_id: data.user_id,
                        status: { [Op.in]: [1, 5] }
                    }
                });
                if (!!!book) {
                    return res.status(400).send({
                        status: false,
                        errors: `SERVER_MESSAGE.SOMETHING_WRONG`
                    });
                }
            } else {
                data['user_id'] = req.user.id;
            }
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
            // db.family_medical_condition.destroy({ where: { user_id: data.user_id, member_id: data.member_id } }).then(resp => {
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
            // }).catch(err => {
            //     res.status(403).send({
            //         success: false,
            //         errors: `${err}`
            //     });
            // });
        } else {
            res.sendStatus(406);
        }
    },
    getFamilyMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            let where = { user_id: req.user.id };
            if (req.query && req.query.member_id) {
                where['member_id'] = req.query.member_id;
            }
            if (req.query && req.query.user_id) {
                where['user_id'] = req.query.user_id;
            }
            db.family_medical_condition.findOne({ where }).then(resp => {

                res.send(resp);
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

    medicalHistory: async (req, res, next) => {
        let data = req.body || {};
        data.added_by = req.user.id;
        if (!!!data.user_id) {
            data.user_id = req.user.id;
        }
        let check = await verifyFamilyMember(req, data.user_id, data.added_by);
        if (!!!check) {
            return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
        }
        if (!!!data.id) {
            delete data.createdAt;
            delete data.updatedAt;
        }
        db.userMedicalHistory.upsert(data).then(resp => res.send({ data: resp })).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    medicalHistories: async (req, res, next) => {
        let where = {};
        let query = req.query || {};
        let order = ['dated', 'desc'];
        let params = req.params || {};
        if (params.class && params.class !== 'all') {
            where.class = req.params.class;
        }
        if (params.user_id) {
            where.user_id = params.user_id;
        } else {
            where.user_id = req.user.id;
        }
        if (params.class == 'prescription') {
            order = ['response.startDate', 'desc']
        }
        let check = await verifyFamilyMember(req, where.user_id, req.user.id);
        if (!!!check) {
            return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
        }
        if (!!query.classes) {
            let classess = query.classes.split(',');
            if (!!classess.length) {
                where.class = { [Op.in]: classess }
            }
        }
        db.userMedicalHistory.findAll({
            where: where,
            order: [order, ['createdAt', 'desc']],
            include: [{
                model: db.user,
                as: 'added_by_user',
                attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'company_name', 'fullName']
            }],
        }).then(resp => res.send(resp)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    deletemedicalHistories: async (req, res, next) => {
        let where = {};
        if (req.params.id) {
            where.id = req.params.id;
        }
        db.userMedicalHistory.destroy({ where }).then(resp => res.send({ status: true })).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    }
};
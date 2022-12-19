const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    getMedicalContitions: async (req, res, next) => {
        console.log(req.lang)
        var lang = 'en';
        if (req.lang) lang = req.lang;
        db.user_questionnaires.findAll({ where: { language: lang } }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                errors: `${err}`,
                success: false
            })
        })
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
    setMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            db.user_medical_condition.findOrCreate({ where: { user_id: req.body.user_id } }).then(resp => {
                if (resp && resp.length) {
                    resp[0].update(req.body).then(resp2 => {
                        res.send(resp2)
                    }).catch(err => {
                        res.status(403).send({
                            success: false,
                            errors: `${err}`
                        })
                    })
                } else {
                    res.status(403).send(
                        { success: false })
                }
            })
        } else {
            res.sendStatus(406)
        }
    },
    getMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            db.user_medical_condition.findOne({ where: { user_id: req.query.user_id } }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(403).send({
                    success: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    },

    async addFamilyMedical(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            data['change_by'] = null;
            data['added_by_admin'] = req.user.id;
            try {
                await db.family_medical.destroy({
                    where: {
                        user_id: data.user_id,
                    }
                });
                if (data.id)
                    delete data.id;
                let resp = await db.family_medical.create(data);
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
            res.sendStatus(406)
        }
    },
    medicals(req, res, next) {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.body.user_id) {
                user_id = req.body.user_id;
            }
            db.family_medical.findOne({ where: { user_id: user_id, family_id: req.body.member_id } }).then(resp => {
                res.send((resp || {}))
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    },
    allmedicals(req, res, next) {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.body.user_id) {
                user_id = req.body.user_id;
            }
            db.family_medical.findAll({
                where: { family_id: req.params.member_id },
                include: [{
                    model: db.user,
                    as: 'change_by_user',
                    attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'company_name', 'fullName']
                },
                {
                    model: db.admin,
                    as: 'added_by_admin_user',
                    attributes: ['first_name', 'last_name', 'fullName']
                }
                ],
                paranoid: false
            }).then(resp => {
                res.send((resp || {}))
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })

        }
        else {
            res.sendStatus(406)
        }
    },
    deletemedicalPermanent(req, res, next) {
        if (req.user && req.user.id) {
            db.family_medical.destroy({
                where: {
                    id: req.params.id
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
                res.send((resp || {}))
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
    setFamilyMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            db.family_medical_condition.findOrCreate({ where: { user_id: req.user.id, member_id: req.body.member_id } }).then(resp => {
                if (resp && resp.length) {
                    resp[0].update(req.body).then(resp2 => {
                        res.send(resp2)
                    }).catch(err => {
                        res.status(403).send({
                            success: false,
                            errors: `${err}`
                        })
                    })
                } else {
                    res.status(403).send(
                        { success: false })
                }
            })
        } else {
            res.sendStatus(406)
        }
    },
    getFamilyMedicalConditionResponse: async (req, res, next) => {
        if (req.user && req.user.id) {
            let where = { user_id: req.user.id }
            if (req.query && req.query.member_id) {
                where['member_id'] = req.query.member_id;
            }
            db.family_medical_condition.findOne({ where }).then(resp => {

                res.send(resp)
            }).catch(err => {
                res.status(403).send({
                    success: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    },
}
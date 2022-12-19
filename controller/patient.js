const Sequelize = require('sequelize');
const { verifyFamilyMember } = require('../commons/patientMiddleware');
const Op = Sequelize.Op;
const db = require("../models");
const { addActivityLog } = require('./activityLog');
/*====Patient History API============*/

async function createHistory(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp = await db.symptom_history.upsert(data);
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

}

async function getFullHistory(req, res, next) {
    if (req.user && req.user.id) {
        db.symptom_history.findAll({ where: { user_id: req.user.id } }).then(resp => {
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
}

async function history(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        db.symptom_history.findByPk(req.body.id).then(resp => {
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
}

/*====Patient Insurance API============*/

async function addInsurance(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        if (!!!data['user_id']) {
            data['user_id'] = req.user.id;
        }
        data['addedBy'] = req.user.id;
        if (!!!data['end_date']) {
            data['end_date'] = null
        }
        if (!!!data.type) {
            data.type = 'individual'
        }
        if (data.type == 'individual') {
            delete data.members
        }
        let c = await verifyFamilyMember(req, data.user_id, data.addedBy);
        if (!!!c) {
            return res.sendStatus(403)
        }
        if (!!data.is_no_insurance) {
            return db.user_insurance.destroy({ where: { user_id: data.user_id, member_id: data.member_id } }).then(resp => {
                return res.send({
                    status: true,
                    data: resp
                })
            })
        }
        let inst = null;
        let memberIds = []
        let members = [];
        let suf = 1;
        (data.members || []).forEach(element => {
            if (!!element.isCovered) {
                memberIds.push(element.member_id);
                if (!!element.isPrimary) {
                    element.policy_number = data.card_number
                    data.member_id = element.member_id;
                }
                else {
                    element.policy_number = data.card_number + `-(${suf++})`
                }
                element.user_id = data.user_id;
                members.push(element)
            }
        });
        data.members = members;
        try {
            if (!!data.id) {
                await db.user_insurance.update(data, { where: { id: data.id } });
                if (!!data.members && !!data.members.length) {
                    await db.user_insurance_member.destroy({
                        where: {
                            // user_id: (data.user_id || req.user.id),
                            insurance_id: data.id,
                            member_id: { [Op.notIn]: memberIds }
                        }
                    });
                    for (let m of data.members) {
                        let a = await db.user_insurance_member.findOrCreate({
                            where: {
                                member_id: m.member_id,
                                insurance_id: data.id,
                            }
                        })
                            .then(resp => {
                                resp[0].update(m);
                                return resp[0]
                            })
                    }
                }
                inst = db.user_insurance.findByPk(data.id, { include: ['members'] });
            } else {
                inst = db.user_insurance.create(data, { include: ['members'] })
            }
            inst.then(async (resp) => {
                res.send({
                    status: true,
                    data: resp
                })
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

}

async function removeInsurance(req, res, next) {
    if (req.user && req.user.id && req.params.id) {
        try {
            let resp = await db.user_insurance.destroy({
                where: {
                    id: req.params.id,
                    [Op.or]: [
                        { user_id: req.user.id },
                        { addedBy: req.user.id }
                    ]
                }
            });
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
    }
    else {
        res.sendStatus(400)
    }
}

async function insurances(req, res, next) {
    let user_id = req.user.id
    let params = req.params || {};
    if (params.user_id) {
        user_id = params.user_id;
    }
    let where = { user_id: user_id };
    where = {
        // user_id: user_id,
        [Op.or]: [
            { user_id: user_id },
            { '$members.member_id$': user_id }
        ]
    };

    db.user_insurance.scope('').findAll({
        where: where,
        attributes: {
            include: [
                [db.sequelize.col("insurance_provider.name"), 'company_name']
            ]
        },
        include: ['members', {
            model: db.insurence_provider, as: 'insurance_provider',
            attributes: []
        }, {
                model: db.user,
                as: 'added_by_user',
                attributes: ['first_name', 'last_name', 'fullName', 'middle_name', 'last_name_2', 'company_name']
            },
            {
                model: db.admin,
                as: 'added_by_admin_user',
                attributes: ['first_name', 'last_name', 'fullName']

            }]
    }).then(async (resp) => {
        let respo = JSON.parse(JSON.stringify(resp));
        for (ress of respo) {
            let memb = await db.user_insurance_member.findAll({ where: { insurance_id: ress.id } })
            ress.members = JSON.parse(JSON.stringify(memb));
        }
        res.send(respo)
    }).catch(err => {
        res.status(400).send({
            status: false,
            errors: `${err}`
        })
    })

}

async function insurance(req, res, next) {
    if (req.user && req.user.id && req.body.id) {
        db.user_insurance.findByPk(req.body.id).then(resp => {
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
}

/*====Patient Medical API============*/


async function medicals(req, res, next) {
    if (req.user && req.user.id) {
        let id = req.user.id;
        if (req.query && req.query.user_id) {
            id = req.query.user_id
        }
        db.user_medical.findOne({ where: { user_id: id } }).then(resp => {
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
}

async function allmedicals(req, res, next) {
    if (req.user && req.user.id) {
        let id = req.user.id;
        if (req.params && req.params.user_id) {
            id = req.params.user_id
        }
        if (id !== req.user.id && req.user.role == 5) {
            let sql = `SELECT * FROM customers c WHERE customer = ${id} AND user_id = ${req.user.id}`;
            let c = await db.sequelize.query(sql).spread((r, m) => r[0]);
            if (!!!c) {
                return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
            }
        }
        if (id !== req.user.id && req.user.role == 1) {
            let c = await db.booking.findOne({
                where: {
                    patient_id: id,
                    provider_id: req.user.id,
                    status: { [Op.in]: [0, 1, 5, 9, 10] }
                }
            })
            if (!!!c) {
                return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
            }
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
}

module.exports = { createHistory, getFullHistory, history, addInsurance, removeInsurance, insurances, insurance, medicals, allmedicals }

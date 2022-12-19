const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { upload } = require('../commons/fileupload');
const { calculateServicePrice } = require('../commons/helper');
const { addActivityLog } = require('./activityLog');

module.exports = {
    async addService(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            try {
                var where = { user_id: data.user_id, department_id: data.department_id, speciality_id: data.speciality_id }

                if (!!data.id) {
                    where.id = { [Op.ne]: data.id };
                }
                let user_service = await db.user_service.findOne({ where: where })
                if (user_service != null) {
                    throw 'ALREADY_SKILLS_EXIST'
                }
                console.log(data)
                let resp = await db.user_service.upsert(data);
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
            addActivityLog({ user_id: req.user.id, type: 'user skills updated' });
        } else {
            res.sendStatus(406)
        }

    },
    async addUserService(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = data.user_id;
            try {
                let resp = await db.user_service.upsert(data);
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
            addActivityLog({ user_id: req.user.id, type: 'user skills updated' });
        } else {
            res.sendStatus(406)
        }

    },
    async removeService(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            try {
                let resp = await db.user_service.destroy({ where: { id: req.body.id } });
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
            res.sendStatus(406)
        }
    },
    async services(req, res, next) {
        if (req.user && req.user.id) {
            let where = { user_id: req.user.id };
            let attributes = ['id', 'details', 'title', 'status', 'role_id'];
            if (req.lang && req.lang == 'es') {
                attributes = ['id', ['details_es', 'details'], ['title_es', 'title'], 'status', 'role_id'];
            }
            if (req.query && req.query.user_id) {
                where = { user_id: req.query.user_id };
            }
            let incAttr = []
            if (!!req.query && !!eval(req.query.short)) {
                attributes = [];
                incAttr = [
                    [db.sequelize.col(`department.title${req.lang == 'es' ? '_es' : ''}`), 'department_name'],
                    [db.sequelize.col(`speciality.title${req.lang == 'es' ? '_es' : ''}`), 'speciality_name'],
                    [db.sequelize.col(`speciality.user_speciality.id`), 'isClinicSpeciality'],
                ]
            }
            let spel = [];
            if (req.user && req.user.role == 5) {
                spel = [
                    {
                        model: db.user_speciality,
                        as: 'user_speciality',
                        where: { user_id: req.user.id }
                    }
                ]
            }
            db.user_service.findAll({
                where: where,
                attributes: {
                    include: incAttr
                },
                include: [
                    {
                        model: db.department,
                        as: 'department',
                        attributes: attributes
                    },
                    {
                        model: db.speciality,
                        as: 'speciality',
                        attributes: attributes,
                        include: spel
                    }
                ]
            }).then(async resp => {
                resp = JSON.parse(JSON.stringify(resp));
                if (resp) await calculateServicePrice(resp, req.user.id);
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
    async service(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            db.user_service.findByPk(req.body.id).then(resp => {
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
    async user_speciality(req, res, next) {
        if (req.user && req.user.id) {
            let attributes = ['id', 'details', 'title', 'symbol', 'status', 'department_id'];
            db.user_speciality.scope().findAll({
                where: { user_id: req.body.user_id },
                include: [
                    { model: db.speciality, as: 'speciality', attributes },
                    { model: db.department, as: 'department' },
                ]
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
}
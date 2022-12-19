const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const md5 = require("md5");

module.exports = {
    async create(req, res, next) {
        if (req.user && req.user.id) {
            try {
                let resp = {};
                if (req.body.id) {
                    resp = await db.sms_templates.findByPk(req.body.id);
                    await resp.update(req.body)
                } else {
                    resp = await db.sms_templates.create(req.body);
                }
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
    async update(req, res, next) {
        if (req.user && req.user.id) {
            try {
                let resp = await db.sms_templates.update(req.body, { where: { id: req.params.id } });
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
    async delete(req, res, next) {
        if (req.user && req.user.id) {
            try {
                let resp = await db.sms_templates.destroy({
                    where: {
                        id: req.params.id
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
        } else {
            res.sendStatus(406)
        }

    },
    async list(req, res, next) {
        console.log(req.user);
        if (req.user && req.user.id) {
            let attributes = ['id', 'title', 'message', 'language', 'minutesbefore'];
            let where = { user_id: 0 };
            if (req.query && req.query.attributes) {
                attributes = req.query.attributes.split(',');
            }
            if (req.query && req.query.status) {
                where.status = req.query.status;
            }
            db.sms_templates.findAll({
                where,
                attributes
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    },
    async get(req, res, next) {
        if (req.user && req.user.id) {
            db.sms_templates.findByPk(req.params.id).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        } else {
            res.sendStatus(406)
        }
    }
}
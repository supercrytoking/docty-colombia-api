const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../../models");
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
                    var data = req.body;
                    if (!!!data.id) data.user_id = req.user.id;
                    resp = await db.sms_templates.create(data);
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
            let attributes = ['id', 'title', 'message', 'language', 'minutesbefore', 'user_id'];
            let where = {};
            if (req.query && req.query.attributes) {
                attributes = req.query.attributes.split(',');
            }
            if (req.query && req.query.status) {
                where.status = req.query.status;
            }
            where.user_id = req.user.id;
            var clinicSmsTmplate = await db.sms_templates.findAll({
                where: where,
                attributes: attributes,
                include: [
                    {
                        model: db.sms_triggers,
                        as: 'trigger',
                        required: false,
                        where: {
                            is_personalization: true,
                        },
                    }],
                order: [['user_id', 'desc']]
            });

            where.user_id = 0; // system default 

            var sms_templateList = await db.sms_templates.findAll({
                where: where, attributes: attributes,
                include: [
                    {
                        model: db.sms_triggers,
                        as: 'trigger',
                        required: true,
                        where: {
                            is_personalization: true,
                        },
                    }],
                order: [['user_id', 'desc']]
            });

            clinicSmsTmplate = clinicSmsTmplate.concat(sms_templateList)

            res.send(clinicSmsTmplate)
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
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async create(req, res, next) {
        if (req.user && req.user.id) {
            try {
                //   let resp = await db.sms_automations.update(req.body,{ where: { template_id: req.body.template_id,trigger_id: req.body.trigger_id, language: req.body.language } })
                let data = req.body;

                var resp;
                for (let b of data) {
                    await db.sms_automations.findOrCreate({ where: { trigger_id: b.trigger_id, language: b.language, user_id: 0 } })

                    resp = await db.sms_automations.update(b, { where: { trigger_id: b.trigger_id, language: b.language, user_id: 0 } })

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
                let resp = await db.sms_automations.update(req.body, { where: { id: req.params.id } });
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
                let resp = await db.sms_automations.destroy({ where: { id: req.params.id } });
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
        if (req.user && req.user.id) {
            db.sms_automations.findAll({ attributes: ['id', 'name', 'trigger_id', 'description', 'template_id'], include: ['trigger', 'template'] }).then(resp => {
                res.send(resp)
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
    async get(req, res, next) {
        if (req.user && req.user.id) {
            db.sms_automations.findByPk(req.params.id).then(resp => {
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
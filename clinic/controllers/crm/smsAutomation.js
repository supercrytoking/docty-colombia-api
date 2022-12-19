const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../../models");


module.exports = {
    async create(req, res, next) {
        if (req.user && req.user.id) {
            try {
                //   let resp = await db.sms_automations.update(req.body,{ where: { template_id: req.body.template_id,trigger_id: req.body.trigger_id, language: req.body.language } })
                let data = req.body;

                var resp;
                for (let d of data) {
                    var sms_template = await db.sms_templates.findByPk(d.template_id);
                    if (sms_template && sms_template.user_id == req.user.id) {//if clinic 's template
                        let b = await db.sms_automations.findOrCreate({ where: { trigger_id: d.trigger_id, language: d.language, user_id: req.user.id } })
                        resp = await db.sms_automations.update(d, { where: { trigger_id: d.trigger_id, language: d.language, user_id: req.user.id } })
                    }
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
    async clearAutomation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                var sms_template = await db.sms_templates.findByPk(data.template_id);
                if (sms_template.user_id == req.user.id) {//if clinic 's template
                    let resp = await db.sms_automations.destroy({ where: { trigger_id: data.trigger_id, template_id: data.template_id } });
                    res.send({
                        status: true,
                        data: resp
                    })
                } else {
                    throw 'SYSTEM_MESSAGE.PERMISSION_DENIED'
                }
            } catch (error) {
                console.log(error)
                res.status(400).send({
                    status: false,
                    errors: error
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
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../../models");


module.exports = {
    async addAutomation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            let promises = [];

            console.log(data)
            for (let d of data) {
                var email_template = await db.email_template.findByPk(d.template_id);
                if (email_template && email_template.user_id == req.user.id) {//if clinic 's template
                    let b = await db.email_automation.findOrCreate({ where: { trigger_id: d.trigger_id, language: d.language, user_id: req.user.id } })
                    await db.email_automation.update(d, { where: { trigger_id: d.trigger_id, language: d.language, user_id: req.user.id } })
                }
            }
            try {
                Promise.all(promises).then(resp => {
                    res.send({
                        status: true,
                        data: resp
                    })
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
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

    },
    async clearAutomation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                var email_template = await db.email_template.findByPk(data.template_id);
                if (email_template.user_id == req.user.id) {//if clinic 's template
                    let resp = await db.email_automation.destroy({ where: { trigger_id: data.trigger_id, template_id: data.template_id } });
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
    async updateAutomation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.email_automation.update(data, { where: { id: data.id } });
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

    async automations(req, res, next) {
        if (req.user && req.user.id) {
            db.email_automation.findAll({ attributes: ['id', 'name', 'identification', 'type', 'trigger_id', 'description', 'status'], include: ['trigger', 'template'] }).then(resp => {
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
    async automation(req, res, next) {
        if (req.user && req.user.id) {
            db.email_automation.findByPk(req.params.id).then(resp => {
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
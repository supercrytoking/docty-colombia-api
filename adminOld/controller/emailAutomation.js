const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async addAutomation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            let promises = [];
            for (let d of data) {
                d['identification'] = d.identification || Date.now().toString(16).toUpperCase();
                let b = await db.email_automation.findOrCreate({ where: { trigger_id: d.trigger_id, language: d.language, user_id: 0 } })
                await db.email_automation.update(d, { where: { trigger_id: d.trigger_id, language: d.language, user_id: 0 } })
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
    async deleteAutomation(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.email_automation.destroy({ where: { id: data.id } });
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
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const md5 = require("md5");

module.exports = {
    async addTemplate(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            data.identification = md5(data.title);
            try {

                let resp = {};
                if (data.id) {
                    resp = await db.email_template.findByPk(data.id);
                    await resp.update(data)
                } else {
                    resp = await db.email_template.create(data);
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
    async updateTemplate(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                // var oldIdentification = data.identification;
                // data.identification = md5(data.title);

                // await db.email_automation.update({ template_id: data.identification }, { where: { template_id: oldIdentification } })
                // await db.email_template.update({ title: data.title, identification: data.identification }, { where: { id: data.id } })

                try {
                    if (data.trigger_id) {
                        await db.email_automation.destroy({ where: { template_id: data.id, user_id: 0 } });
                        var automations = [
                            { trigger_id: null, template_id: null, language: 'en', lang: 'english', type: 'Email', status: 1, user_id: 0 },
                            { trigger_id: null, template_id: null, language: 'es', lang: 'spanish', type: 'Email', status: 1, user_id: 0 }
                        ];
                        var automation = automations.find(a => a.language == data.language);
                        if (automation) {
                            data.trigger_id.map(async trigger_id => {
                                automation.template_id = data.id;
                                automation.trigger_id = trigger_id;
                                var automationClone = JSON.parse(JSON.stringify(automation));
                                await db.email_automation.upsert(automationClone);
                            });
                        }
                    }
                } catch (e) { console.log(e) }
                let resp = await db.email_template.upsert(data);
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
    async deleteTemplate(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.email_template.destroy({ where: { id: data.id } });
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
    async templates(req, res, next) {
        if (req.user && req.user.id) {
            let attributes = ['id', 'title', 'html', 'language', 'design', 'identification', 'description', 'deliveries', 'status', 'subject'];
            let where = { user_id: 0 };
            if (req.query && req.query.attributes) {
                attributes = req.query.attributes.split(',');
            }
            if (req.query && req.query.status) {
                where.status = req.query.status;
            }
            if (req.query && req.query.language) {
                where.language = req.query.language;
            }

            db.email_template.findAll({ where: where, attributes: attributes, include: ['trigger'] }).then(resp => {
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
    async template(req, res, next) {
        if (req.user && req.user.id) {
            db.email_template.findOne({ where: { id: req.params.id }, include: ['trigger'] }).then(resp => {
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
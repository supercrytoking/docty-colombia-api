const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async create(req, res, next) {
        if (req.user && req.user.id) {
            try {
                let resp = await db.sms_triggers.create(req.body);
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
            res.sendStatus(406);
        }

    },
    async update(req, res, next) {
        if (req.user && req.user.id) {
            try {
                let resp = await db.sms_triggers.upsert(req.body);
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
            res.sendStatus(406);
        }

    },
    async delete(req, res, next) {
        if (req.user && req.user.id) {
            try {
                let resp = await db.sms_triggers.destroy({
                    where: {
                        id: req.params.id
                    }
                });
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
            res.sendStatus(406);
        }

    },
    async list(req, res, next) {
        if (req.user && req.user.id) {
            db.sms_triggers.findAll({
                include: [{
                    model: db.sms_templates,
                    as: 'template',
                    required: false,
                    attributes: ['id', 'language', 'title'],
                    where: {
                        user_id: 0
                    }
                }]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        } else {

            res.sendStatus(406);
        }
    },
    async get(req, res, next) {
        if (req.user && req.user.id) {
            db.sms_triggers.findByPk(req.params.id).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        } else {
            res.sendStatus(406);
        }
    }
};
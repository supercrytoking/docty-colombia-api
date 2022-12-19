const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../../models");
const { smsOtpTrigger, smsTrigger } = require('../../../commons/smsCrmTrigger')


module.exports = {
    async list(req, res, next) {
        if (req.user && req.user.id) {
            db.sms_triggers.findAll({
                where: { is_personalization: true },
                include: [{
                    model: db.sms_templates,
                    as: 'template',
                    where: {
                        user_id: { [Op.in]: [0, req.user.id] }
                    },
                    required: false,
                    attributes: ['id', 'language', 'title', 'user_id']
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
    },
    async testTrigger(req, res) {
        try {
            smsOtpTrigger(req.body.trigger.name, { to: req.body.phone_number }, req.lang);
            res.send({ success: true });
        } catch (err) {
            res.status(400).send({
                status: false,
                errors: err
            });
        }
    }
};
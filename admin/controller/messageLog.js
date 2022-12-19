const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    async addMessageLog(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                db.message_log.upsert(data).then(resp => {
                    res.send({
                        status: true,
                        data: resp
                    })
                }).catch(err => {
                    res.send(err)
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
    async messageLogs(req, res, next) {
        if (req.user && req.user.id) {
            db.message_log.findAll({ where: { [Op.or]: [{ sender: req.user.id }, { receiver: req.user.id }] } }).then(resp => {
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
    // message reference
    async getMessageReference(req, res, next) {
        if (req.user && req.user.id) {
            var data = req.body;
            db.message_reference.findOne({
                where: data
            }).then(resp => {
                if (resp == null) {
                    db.message_reference.create(data).then(resp2 => res.send(resp2)).catch(error => console.log(error))
                } else res.send(resp);
            }).catch(err => {
                console.log(err)
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
    async messageLogsOfUser(req, res, next) {
        if (req.user && req.user.id) {
            var other_uid = req.body.user_id;
            db.message_log.findAll({
                where: {
                    [Op.or]: [
                        {
                            sender_admin: req.user.id,
                            receiver: other_uid
                        },
                        {
                            receiver_admin: req.user.id,
                            sender: other_uid
                        }
                    ]
                }
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err)
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
    async messageLogsOfAdmin(req, res, next) {
        if (req.user && req.user.id) {
            var other_uid = req.body.user_id;
            db.message_log.findAll({
                where: {
                    [Op.or]: [
                        {
                            sender_admin: req.user.id,
                            receiver_admin: other_uid
                        },
                        {
                            receiver_admin: req.user.id,
                            sender_admin: other_uid
                        }
                    ]
                }
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err)
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
    async messageLogSeen(req, res, next) {
        if (req.user && req.user.id) {
            var where = { receiver_admin: req.user.id }
            if (req.body.user_id) where.sender = req.body.user_id;
            if (req.body.admin_id) where.sender_admin = req.body.admin_id;
            db.message_log.update({ seen: true }, {
                where: where
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err)
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
    async messageLog(req, res, next) {
        if (req.user && req.user.id) {
            db.message_log.update({ seen: true }, { where: { receiver: req.user.id } }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })

        }
        else {
            console.log('406');
            res.sendStatus(406)
        }
    },
    async remove(req, res, next) {
        if (req.user && req.user.id) {
            try {
                await db.message_log.destroy({ where: { id: req.body.id } });
                res.send({
                    success: true,
                    message: 'Deleted Successfully'
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
    }
}
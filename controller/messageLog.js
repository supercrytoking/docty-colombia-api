const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    async addMessageLog(req, res, next) {

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
    },
    async messageLogs(req, res, next) {
        if (req.user && req.user.id) {
            db.message_log.findAll({
                where: {
                    [Op.or]: [{ sender: req.user.id }, { receiver: req.user.id }]
                },
                include: [
                    'sender_info', 'sender_admin_info', 'receiver_info', 'receiver_admin_info',
                    {
                        model: db.message_reference,
                        as: 'reference_info',
                        include: [{
                            model: db.booking,
                            as: 'booking',
                            include: ['schedule']
                        }],
                        required: false
                    },
                ],
                // order: [['createdAt', 'desc']]
            }).then(resp => {
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
    async messageLogsWithUserId(req, res, next) {
        if (req.user && req.user.id) {
            var self_uid = req.body.user_id;
            db.message_log.findAndCountAll({
                where: { [Op.or]: [{ sender: self_uid }, { receiver: self_uid }] },
                include: [
                    'sender_info', 'sender_admin_info', 'receiver_info', 'receiver_admin_info',
                    {
                        model: db.message_reference,
                        as: 'reference_info',
                        include: [{
                            model: db.booking,
                            as: 'booking',
                            include: ['schedule']
                        }]
                    },
                ],
                order: [['createdAt', 'DESC']],
                limit: req.body.is_all ? null : 7
            }).then(resp => {
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
    async messageLogsBetweenTwoUser(req, res, next) {
        if (req.user && req.user.id) {
            var self_uid = req.body.user_id;
            var other_uid = req.body.other_id;
            db.message_log.findAndCountAll({
                where: {
                    [Op.or]: [
                        {
                            sender: self_uid,
                            receiver: other_uid
                        },
                        {
                            sender: other_uid,
                            receiver: self_uid,
                        }
                    ],
                },
                include: [
                    'sender_info', 'sender_admin_info', 'receiver_info', 'receiver_admin_info',
                    {
                        model: db.message_reference,
                        as: 'reference_info',
                        include: [{
                            model: db.booking,
                            as: 'booking',
                            include: ['schedule']
                        }]
                    },
                ],
                order: [['createdAt', 'DESC']],
                limit: req.body.is_all ? null : 7
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                console.log(err);
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
    async messageLogsOfUserWithReference(req, res, next) {
        if (req.user && req.user.id) {
            var other_uid = req.body.user_id;
            var reference = req.body.reference;
            db.message_log.findAll({
                where: {
                    [Op.or]: [
                        {
                            sender: req.user.id,
                            receiver: other_uid
                        },
                        {
                            receiver: req.user.id,
                            sender: other_uid
                        }
                    ],
                    reference: reference
                }, include: ['sender_info', 'sender_admin_info', 'receiver_info', 'receiver_admin_info']
            }).then(resp => {
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
    async messageLogsOfUser(req, res, next) {
        if (req.user && req.user.id) {
            var other_uid = req.body.user_id;
            var admin_id = req.body.admin_id;
            let where = '';
            if (!!!other_uid && !!!admin_id) {
                return res.send([])
            }

            if (!!other_uid) {
                where = ` WHERE (sender = ${req.user.id} AND  receiver = ${other_uid}) 
                OR (sender = ${other_uid} AND  receiver = ${req.user.id})`
            } else {
                where = ` WHERE (sender = ${req.user.id} AND  receiver_admin = ${admin_id})
                OR (sender_admin = ${admin_id} AND  receiver = ${req.user.id})`
            }
            let sql = `SELECT createdAt, id,message,
                        sender,receiver,sender_admin,receiver_admin,seen,isFileUrl,reference
                        FROM message_logs ${where}
                        UNION ALL (
                            SELECT DATE(createdAt) createdAt, NULL id ,
                            IF(DATE(createdAt) = CURDATE(),'CALENDAR.TODAY',DATE_FORMAT(createdAt,'%a, %d %b %Y')) message,
                            sender,receiver,sender_admin,receiver_admin,seen,isFileUrl,'date' reference
                            FROM message_logs ${where} GROUP BY DATE(createdAt)
                        )
                        ORDER BY createdAt`
            db.sequelize.query(sql).spread((r, m) => {
                res.send(r)
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
    async messageLogsOfReviewer(req, res, next) {
        if (req.user && req.user.id) {

            db.message_log.findAll({
                where: {
                    [Op.or]: [
                        {
                            sender: req.user.id,
                            receiver_admin: { [Op.ne]: null }
                        },
                        {
                            receiver: req.user.id,
                            sender_admin: { [Op.ne]: null }
                        }
                    ]
                },
                include: [
                    'sender_admin_info', 'receiver_admin_info', 'receiver_info', 'receiver_admin_info',
                ]
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
            var other_uid = req.body.user_id;
            var where = { receiver: req.user.id }
            if (req.body.isAdmin) {
                where.sender_admin = other_uid;
            } else {
                where.sender = other_uid;
            }
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
    },
    async unreadCount(req, res, next) {
        if (req.user && req.user.id) {
            try {
                db.message_log.findAndCountAll({ where: { receiver: req.user.id, seen: false, sender: { [Op.ne]: null } } }).then(resp => {
                    res.send(resp);
                });
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

    async getNewMessage(req, res, next) {
        if (req.user && req.user.id) {
            try {
                db.message_log.findAll({
                    where: { receiver: req.user.id, seen: false, sender: { [Op.ne]: null } },
                    include: [{
                        model: db.message_reference,
                        as: 'reference_info',
                        include: [{
                            model: db.booking,
                            as: 'booking',
                            include: ['providerInfo', 'patientInfo', 'schedule']
                        }]
                    }, 'sender_info']
                }).then(resp => {
                    resp = resp || [];
                    resp = resp.filter(r => { return r.sender_info != null; });
                    res.send(resp);
                });
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
    myMessangers: async (req, res, next) => {
        let user = req.user.id;
        let sql = `SELECT  msg.id,msg.sender_admin,msg.receiver_admin,msg.sender,msg.receiver,msg.message,msg.seen,msg.isFileUrl,msg.createdAt,
        IF(a.first_name IS NULL,IF(LENGTH(u.company_name),u.company_name, CONCAT_WS(' ',u.first_name, NULLIF(u.middle_name,''),
        NULLIF(u.last_name,''),u.last_name_2)),CONCAT_WS(' ',a.first_name,a.last_name)) buddy,u.id user_id,a.id admin_id,
        IF(a.first_name IS NULL, u.picture,a.picture) picture,
        (SELECT COUNT(id) FROM message_logs WHERE seen = 0 AND receiver = ${user} AND (sender_admin = a.id OR sender = u.id)) AS unseen
        FROM (SELECT MAX(id) AS id FROM message_logs ml
            WHERE ml.sender = ${user} OR ml.receiver = ${user}
            GROUP BY GREATEST(ml.sender,ml.receiver),LEAST(ml.sender,ml.receiver),
            GREATEST(ml.sender_admin,ml.receiver),LEAST(ml.sender_admin,ml.receiver),
            GREATEST(ml.sender,ml.receiver_admin),LEAST(ml.sender,ml.receiver_admin)
        ) AS ls
        JOIN message_logs msg ON msg.id = ls.id
        LEFT JOIN users u ON u.id = IF(msg.sender = ${user},msg.receiver,msg.sender)
        LEFT JOIN admins a ON a.id = IF(msg.sender_admin IS NULL,msg.receiver_admin,msg.sender_admin)
        WHERE u.id IS NOT NULL or a.id is not null
        ORDER BY msg.createdAt DESC`;
        db.sequelize.query(sql).spread((r, m) => res.send(r)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    },
    mychatmates: async (req, res) => {
        let user = req.user.id;
        let sql = `SELECT u.id user_id, IF(NULLIF(u.company_name,'') IS NULL,CONCAT_WS(' ',u.first_name, NULLIF(u.middle_name,''), NULLIF(u.last_name,''),u.last_name_2),u.company_name) buddy ,
        IF(ur.role_id = 1,'SIGNUP.DOCTOR','SIGNUP.NURSE') role,u.picture
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id AND ur.role_id IN (1,3)
        JOIN associates a ON a.associate = u.id AND a.user_id = ${user} AND u.deletedAt IS NULL
        UNION(
        SELECT u.id user_id, IF(NULLIF(u.company_name,'') IS NULL,CONCAT_WS(' ',u.first_name, NULLIF(u.middle_name,''), NULLIF(u.last_name,''),u.last_name_2),u.company_name) buddy ,
        'SIGNUP.PHARMACY' role,u.picture
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN clinic_pharmacies a ON a.pharmacy_id = u.id AND a.clinic_id = ${user} AND u.deletedAt IS NULL
        )`;
        db.sequelize.query(sql).spread((r, m) => res.send(r)).catch(e => res.status(400).send({ status: false, error: `${e}` }))
    }
}
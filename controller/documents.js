const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { upload } = require('../commons/fileupload');

module.exports = {
    async addDocument(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            if (!!!data['user_id']) data['user_id'] = req.user.id;
            data.addedBy = data.addedBy || req.user.id;
            console.log(data.user_id, data.addedBy)
            if (+data.user_id !== +req.user.id) {
                let sql = `
                SELECT * FROM customers c
                        JOIN user_kindreds uk ON uk.user_id = c.customer
                        WHERE (c.user_id = ${data.addedBy} OR uk.user_id = ${data.addedBy})
                        AND uk.deletedAt IS NULL
                        AND (uk.member_id = ${data.user_id} OR c.customer = ${data.user_id});`;
                let c = await db.sequelize.query(sql).spread((r, m) => r[0]);
                if (!!!c) {
                    return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
                }
            }

            try {
                var user_document;

                if (data.id) user_document = db.user_document.upsert(data)
                else user_document = db.user_document.create(data);

                user_document.then(resp => {
                    res.send({
                        status: true,
                        data: data.id ? data : resp
                    })
                }).catch(err => {
                    res.send(err)
                })

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
    async documents(req, res, next) {
        if (req.user && req.user.id) {
            let family_id = 0;

            var user_id = req.user.id;
            if (req.params && req.params.user_id) {
                user_id = req.params.user_id
            }
            let book = await db.booking.findOne({
                where: {
                    provider_id: req.user.id,
                    patient_id: user_id,
                    status: { [Op.in]: [1, 5] }
                }
            })
            if (!!!book) {
                if (user_id !== req.user.id) {
                    let sql = `
                    SELECT * FROM clinic_user_family_view c WHERE clinic = ${req.user.id}  AND patient = ${user_id}`;
                    let c = await db.sequelize.query(sql).spread((r, m) => r[0]);
                    if (!!!c) {
                        return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
                    }
                }
            }
            let where = { user_id };
            let query = req.query || {};

            if (query.type) {
                where.type = query.type;
            }
            db.user_document.findAll({
                where: where,
                include: [{
                    model: db.user,
                    attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'fullName', 'company_name'],
                    as: 'addedByUser'
                }]
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
    async document(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            db.user_document.findByPk(req.body.id).then(resp => {
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
    async remove(req, res, next) {
        if (req.user && req.user.id) {
            // if (user_id !== req.user.id) {
            //     let sql = `SELECT * FROM customers c WHERE customer = ${user_id} AND user_id = ${req.user.id}`;
            //     let c = await db.sequelize.query(sql).spread((r, m) => r[0]);
            //     if (!!!c) {
            //         return res.status(403).send({ status: false, message: 'Un-Authorized Access' })
            //     }
            // }
            try {
                await db.user_document.destroy({
                    where: {
                        id: req.body.id,
                        [Op.or]: [
                            { addedBy: req.user.id },
                            { user_id: req.user.id }
                        ]
                    }
                });
                res.send({
                    success: true,
                    message: 'Deleted Successfully'
                })
            } catch (error) {
                res.status(403).send({
                    status: false,
                    errors: error
                })
            }
        } else {
            res.sendStatus(406)
        }
    }
}
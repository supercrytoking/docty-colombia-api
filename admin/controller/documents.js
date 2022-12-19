const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    async addDocument(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = data.user_id;
            data['family_id'] = data.family_id || 0;
            data.addedBy = null;
            data.added_by_admin = req.user.id;
            try {
                db.user_document.upsert(data).then(resp => {
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
        } else {
            res.sendStatus(406)
        }
    },
    async documents(req, res, next) {
        if (req.user && req.user.id) {
            let family_id = 0;
            if (req.query && req.query.family_id) {
                family_id = req.query.family_id
            }
            db.user_document.findAll({
                where: { user_id: req.query.user_id, family_id: family_id },
                include: [{
                    model: db.user,
                    as: 'addedByUser',
                    attributes: ['first_name', 'middle_name', 'last_name', 'last_name_2', 'company_name', 'fullName']
                },
                {
                    model: db.admin,
                    as: 'added_by_admin_user',
                    attributes: ['first_name', 'last_name', 'fullName']
                }
                ],
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
            try {
                await db.user_document.destroy({ where: { id: req.body.id } });
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
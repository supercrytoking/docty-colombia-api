const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');

module.exports = {
    async addDocument(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
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
        if (req.body.user_id) {
            db.user_document.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
        if (req.body.id) {
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
        if (req.body.id) {
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
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { upload } = require('../commons/fileupload');


module.exports = {
    async addService(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            try {
                let resp = await db.user_charge.upsert(data);
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
    async removeService(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            try {
                let resp = await db.user_charge.destroy({ where: { id: req.body.id } });
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
        }
        else {
            res.sendStatus(406)
        }
    },
    async services(req, res, next) {
        if (req.user && req.user.id) {
            db.user_charge.findAll({ where: { user_id: req.user.id } }).then(resp => {
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
    async service(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            db.user_charge.findByPk(req.body.id).then(resp => {
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
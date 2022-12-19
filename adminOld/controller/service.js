const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');


module.exports = {
    async addService(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.user_service.upsert(data);
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
    async updateService(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            try {
                let resp = await db.user_service.update(data, { where: { id: data.id } });
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
        if (req.body.id) {
            try {
                let resp = await db.user_service.destroy({ where: { id: req.body.id } });
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
        if (req.body.user_id) {
            db.user_service.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
        if (req.body.id) {
            db.user_service.findByPk(req.body.id).then(resp => {
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
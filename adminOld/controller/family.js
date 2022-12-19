const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { upload } = require('../../commons/fileupload');


module.exports = {
    async addFamily(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.user_family.upsert(data);
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
    async removeFamily(req, res, next) {
        if (req.body.id) {
            try {
                let resp = await db.user_family.destroy({ where: { id: req.body.id } });
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
    async families(req, res, next) {
        if (req.body.user_id) {
            db.user_family.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
    async family(req, res, next) {
        if (req.body.id) {
            db.user_family.findByPk(req.body.id).then(resp => {
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
    async uploadImage(req, res, next) {
        upload(req, 'avatar', 'file').then(async (resp) => {
            res.send({
                status: true,
                path: resp.path
            }).catch(err => {
                res.status(404).json({
                    error: true,
                    status: false,
                    errors: `${err}`
                })
            })
        })
    },
    async allowAccess(req, res, next) {
        if (req.body.id) {
            db.user_family.update(req.body, { where: { id: req.body.id } }).then(resp => {
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

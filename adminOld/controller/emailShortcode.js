const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    async addShortcode(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.email_shortcode.create(data);
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
    async updateShortcode(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.email_shortcode.upsert(data);
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
    
    async deleteShortcode(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            try {
                let resp = await db.email_shortcode.destroy({ where: { id: data.id } });
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
    async shortcodes(req, res, next) {
        if (req.user && req.user.id) {
            db.email_shortcode.findAll().then(resp => {
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
    async shortcode(req, res, next) {
        if (req.user && req.user.id) {
            db.email_shortcode.findByPk(req.params.id).then(resp => {
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
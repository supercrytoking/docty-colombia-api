const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

module.exports = {
    createOffer: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            let offer;
            try {
                if (data.id) {
                    offer = db.offer.update(data, { where: { id: data.id } });
                } else {
                    data['admin_id'] = req.user.id;
                    offer = db.offer.create(data);
                    // data.id = offer.id
                }
                offer.then(resp => {
                    res.send(resp);
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    })
                })
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            }
        } else {
            res.sendStatus(406)
        }
    },
    deleteOffer: (req, res, next) => {
        if (req.user && req.user.id) {
            db.offer.destroy({
                where: { id: req.body.id, user_id: req.user.id }
            }).then(resp => {
                res.send(
                    {
                        status: true,
                        message: 'deleted successfully'
                    }
                )
            }).catch(err => {
                res.send(
                    {
                        status: true,
                        errors: `${err}`
                    }
                )
            })
        } else {
            res.sendStatus(406)
        }
    },
    getOffer: (req, res, next) => {
        if (req.user && req.user.id) {
            db.offer.findAll({
                where: { user_id: req.user.id }, include: ['user', { model: db.admin, as: 'admin', where: { id: req.user.id }, required: false }]
            }).then(resp => {
                res.send(resp);
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    getOfferList: (req, res, next) => {
        if (req.user && req.user.id) {
            db.offer.findAll({
                where: {}, include: ['user', { model: db.admin, as: 'admin', where: { id: req.user.id }, required: false }]
            }).then(resp => {
                res.send(resp);
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    getOfferByAdmin: (req, res, next) => {
        if (req.user && req.user.id) {
            db.offer.findAll({
                where: {
                    admin_id: req.body.admin_id,
                }
            }).then(resp => {
                res.send(resp);
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    }
}
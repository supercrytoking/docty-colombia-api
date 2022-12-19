const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    createOffer: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            data['user_id'] = req.user.id;
            let offer;
            try {
                if (data.id) {
                    offer = db.offer.update(data, { where: { id: data.id } });
                } else {
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
                where: { user_id: req.user.id }
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
                where: {}, include: ['user']
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
    getOfferByUser: (req, res, next) => {
        if (req.user && req.user.id) {
            db.offer.findAll({
                where: {
                    status: 1,
                    user_id: req.body.user_id,
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
var request = require('request');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    async addTrack(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;

            try {
                let resp = await db.gps_track.upsert(data);
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

    async tracks(req, res, next) {
        if (req.user && req.user.id) {
            db.gps_track.findAll({ where: { user_id: req.user.id } }).then(resp => {
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

    async removeTracks(req, res, next) {
        if (req.user && req.user.id) {

            db.gps_track.destroy({ where: { user_id: req.user.id } }).then(resp => {
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
    async addLocation(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            global.io.emit('gps_location', data);
            try {
                let resp = await db.gps_location.upsert(data);
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

    async locations(req, res, next) {
        if (req.user && req.user.id) {
            db.gps_location.findAll({ where: { user_id: req.user.id } }).then(resp => {
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

    async removeLocations(req, res, next) {
        if (req.user && req.user.id) {
            global.io.emit('gps_location_clear', { user_id: req.user.id });
            db.gps_location.destroy({ where: { user_id: req.user.id } }).then(resp => {
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
    async google_map_eta(req, res, next) {
        console.log('req.body', req.body)
        request.get(`https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${req.body.origin.lat},${req.body.origin.lng}&destinations=${req.body.destination.lat}%2C${req.body.destination.lng}&key=${req.body.google_map_key}`,
            (err, result, body) => {
                console.log(err)
                if (err || !body) {
                    return res.status(400).send({
                        status: false,
                        errors: err
                    })
                }
                res.send(body);
            })
    }
}
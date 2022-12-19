const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const express = require('express');

module.exports = {
    async addLocation(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            data['user_id'] = req.body.user_id;
            try {
                let resp = await db.location.upsert(data);
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
    async updateLocation(req, res, next) {
        if (req.body.user_id) {
            let data = req.body;
            try {
                let resp = await db.location.update(data, { where: { id: data.id } });
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

    async removeLocation(req, res, next) {
        if (req.body.id) {
            try {
                let resp = await db.location.destroy({ where: { id: req.body.id } });
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
    async locations(req, res, next) {
        if (req.body.user_id) {
            db.location.findAll({ where: { user_id: req.body.user_id } }).then(resp => {
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
    async location(req, res, next) {
        if (req.body.id) {
            db.location.findByPk(req.body.id).then(resp => {
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
    async locationTimings(req, res, next) {
        if (req.body.id) {
            db.location_open.findAll({ where: { location_id: req.body.id } }).then(resp => {
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

    async my_avalability(req, res, next) {
        if (req.body.user_id) {
            db.location_open.findAll({
                where: { user_id: req.body.user_id, location_id: req.body.location_id },
                include: ['times']
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async my_all_avalability(req, res, next) {
        if (req.body.user_id) {
            db.location_open.findAll({
                where: { user_id: req.body.user_id },
                include: ['times']
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },

    async addAvailablity(req, res, next) {
        if (req.body.user_id) {
            let data = req.body.timetable;
            let promises = [];
            try {
                for (let i = 0; i < data.length; i++) {
                    let element = data[i];
                    let d = await db.location_open.findOrCreate({
                        where: {
                            open_days: element.open_days,
                            user_id: req.body.user_id,
                            location_id: req.body.location_id
                        }, defaults: {
                            open_days: element.open_days,
                            is_open: element.is_open,
                            location_id: req.body.location_id,
                            user_id: req.body.user_id,
                            is_full_time: element.is_full_time
                        }
                    }).catch(err => {
                        console.log('errro', err)
                    })
                    if (d && d.length) {
                        await d[0].update(
                            {
                                open_days: element.day,
                                is_open: element.is_open,
                                location_id: req.body.location_id,
                                user_id: req.body.user_id,
                                is_full_time: element.is_full_time
                            }
                        ).catch(err => {
                            console.log('errro', err)
                        })
                        await db.location_open_time.destroy({ where: { location_open_id: d[0].id } }).catch(err => {
                            throw err
                        })
                        for (let j = 0; j < element.times.length; j++) {
                            if (element.is_open && !element.is_full_time) {
                                let ele = element.times[j]
                                await db.location_open_time.create({
                                    location_id: req.body.location_id,
                                    location_open_id: d[0].id,
                                    open_hour: ele.opening.hour,
                                    open_minuts: ele.opening.minute,
                                    closing_hour: ele.closing.hour,
                                    closing_minuts: ele.closing.minute
                                }).catch(err => {
                                    console.log('errro', err)
                                })
                            }
                        }
                    } else {
                        res.sendStatus(500)
                    }
                }
                res.send({
                    status: true,
                    message: 'Time table updated successfully..'
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
    async userLocationAvalability(req, res, next) {
        let id = req.body.user_id;
        if (req.quesry && req.query.id) {
            id = req.query.id;
        }

        try {
            const locations = await db.location.findAll({
                where: { user_id: id }
            })
            const availablity = await db.location_open.findAll({
                where: { user_id: id },
                include: ['times']
            })
            res.send({
                locations, availablity
            })
        } catch (error) {
            res.status(500).send({
                status: false,
                errors: error
            });
        }
    }
}
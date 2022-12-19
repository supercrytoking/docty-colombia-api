const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const express = require('express');
const { addActivityLog } = require('./activityLog');
module.exports = {
    async addAddress(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            if (!!!data.user_id) {
                data['user_id'] = req.user.id;
            }
            if (data.user_id != req.user.id) {
                let fm = await db.user_kindred.findOne({ where: { user_id: req.user.id, member_id: data.user_id } });
                if (!!!fm) {
                    return res.status(400).send({
                        status: false,
                        message: 'SERVER_MESSAGE.UN_AUTHORIZED_ACCESS',
                        error: `SERVER_MESSAGE.UN_AUTHORIZED_ACCESS`
                    });
                }
            }
            try {
                let address = await db.address.findOrCreate({ where: { user_id: data.user_id } });
                let resp = await address[0].update(data);
                addActivityLog({ user_id: req.user.id, type: 'Address_Update' });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error,
                    error: `${error}`
                });
            }
        } else {
            res.sendStatus(406);
        }

    },
    async removeAddress(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            try {
                let resp = await db.address.destroy({ where: { id: req.body.id } });
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
    async addresses(req, res, next) {
        if (req.user && req.user.id) {
            db.address.findAll({ where: { user_id: req.user.id } }).then(resp => {
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
    async address(req, res, next) {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.query && req.query.user_id) {
                user_id = req.query.user_id;
            }
            if (req.params && req.params.user_id) {
                user_id = req.params.user_id;
            }
            db.address.findOne({
                where: {
                    [Op.or]: [
                        { user_id: user_id },
                        { '$family.member_id$': user_id, '$family.user_id$': req.user.id }
                    ]
                },
                include: [
                    {
                        model: db.user_kindred.scope(''),
                        as: 'family',
                        attributes: ['member_id', 'user_id'],
                    }
                ]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: err
                });
            });

        }
        else {
            res.sendStatus(406);
        }
    },

    async locationTimings(req, res, next) {
        if (req.body.id) {
            db.address_open.findAll({ where: { location_id: req.body.id } }).then(resp => {
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
        if (req.user && req.user.id) {
            db.address_open.findAll({
                where: { user_id: req.user.id, location_id: req.body.location_id },
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
        if (req.user && req.user.id) {
            db.address_open.findAll({
                where: { user_id: req.user.id },
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
        if (req.user && req.user.id) {
            let data = req.body.timetable;
            let promises = [];
            try {
                for (let i = 0; i < data.length; i++) {
                    let element = data[i];
                    let d = await db.address_open.findOrCreate({
                        where: {
                            open_days: element.open_days,
                            user_id: req.user.id,
                            location_id: req.body.location_id
                        }, defaults: {
                            open_days: element.open_days,
                            is_open: element.is_open,
                            location_id: req.body.location_id,
                            user_id: req.user.id,
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
                                user_id: req.user.id,
                                is_full_time: element.is_full_time
                            }
                        ).catch(err => {
                            console.log('errro', err)
                        })
                        await db.address_open_time.destroy({ where: { location_open_id: d[0].id } }).catch(err => {
                            throw err
                        })
                        for (let j = 0; j < element.times.length; j++) {
                            if (element.is_open && !element.is_full_time) {
                                let ele = element.times[j]
                                await db.address_open_time.create({
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
    }
    ,
    async userLocationAvalability(req, res, next) {
        let id = req.user.id;
        if (req.quesry && req.query.id) {
            id = req.query.id;
        }

        try {
            const locations = await db.address.findAll({
                where: { user_id: id }
            })
            const availablity = await db.address_open.findAll({
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
    },
    async addUserAddress(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = data.user_id;
            try {
                let address = await db.address.findOrCreate({
                    where: {
                        user_id: data.user_id
                    }
                });
                let resp = await address[0].update(data);
                // addActivityLog({ user_id: req.body.user_id, type: 'Address_Update'});
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
    async getUserAddress(req, res, next) {
        if (req.user && req.user.id) {
            db.address.findOne({ where: { user_id: req.body.user_id } }).then(resp => {
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
}
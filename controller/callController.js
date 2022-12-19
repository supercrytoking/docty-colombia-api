const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
function calculateEmotions(data) {
    let anger = 0;
    let contempt = 0;
    let disgust = 0;
    let fear = 0;
    let happiness = 0;
    let neutral = 0;
    let sadness = 0;
    let surprise = 0;
    data.forEach(function (item) {
        anger += item.emotion.anger;
        contempt += item.emotion.contempt;
        disgust += item.emotion.disgust;
        fear += item.emotion.fear;
        happiness += item.emotion.happiness;
        neutral += item.emotion.neutral;
        sadness += item.emotion.sadness;
        surprise += item.emotion.surprise;
    });
    return {
        "anger": anger / data.length,
        "contempt": contempt / data.length,
        "disgust": disgust / data.length,
        "fear": fear / data.length,
        "happiness": happiness / data.length,
        "neutral": neutral / data.length,
        "sadness": sadness / data.length,
        "surprise": surprise / data.length
    };
}
module.exports = {

    saveCall: (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            data['caller_id'] = req.user.id;
            data['status'] = 0;
            db.call.findOrCreate({ where: { call_id: data.call_id } }).then(async call => {
                let cl = call[0]
                await cl.update(data);
                res.send({
                    status: true,
                    data: cl
                })

            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStaus(406)
        }
    },
    saveMood: (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            data['mood'] = calculateEmotions(req.body.behaviours);
            db.user_mood.findOrCreate({
                where: {
                    call_id: data.call_id
                }
            }).then(async resp => {
                let respp = resp[0];
                await respp.update(data);
                res.send({
                    status: true,
                    data: respp
                })
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStaus(406)
        }
    },
    saveEmotion: async (req, res, next) => {
        if (req.user && req.user.id) {
            await db.councelling.findOrCreate(
                { where: { channel: req.body.channel, patient_id: req.user.id } }
            ).then(resp => {
                resp[0].update({ emotions: req.body.emotions })
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                })
            })
        }
    },
    saveEmotionPr: async (req, res, next) => {
        if (req.user && req.user.id) {
            await db.councelling.findOrCreate(
                { where: { channel: req.body.channel, provider_id: req.user.id, patient_id: req.body.patient_id } }
            ).then(resp => {
                resp[0].update({ emotions: req.body.emotions })
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                })
            })
        }
    },
    getEmotion: (req, res, next) => {
        db.councelling.findOne({ where: { channel: req.body.channel }, attributes: ['channel', 'emotions'] }).then(resp => {
            res.send(resp)
        }).catch(err => {
            res.status(400).send({
                success: false,
                errors: `${err}`
            })
        })
    },
    getCalls: (req, res, next) => {
        if (req.user && req.user.id) {
            let id = req.user.id;
            if (req.params && req.params.caller_id) {
                id = req.params.caller_id;
            }
            db.call.findAll({ where: { caller_id: id }, include: ['receiver', 'mood'] }).then(resp => {
                res.send(resp)
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStaus(406)
        }
    },

    getCall: (req, res, next) => {
        if (req.user && req.user.id) {
            let id = req.body.id;
            db.booking.findByPk(id, {
                include: ['booking_calls',
                    'providerInfo',
                    'patientInfo',
                    'family_member']
            }).then(resp => {
                res.send(resp)
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStaus(406)
        }
    },

    getMoodOnCall: (req, res, next) => {
        if (req.user && req.user.id) {
            let call_id = req.body.call_id;
            db.user_mood.findOne({ where: { call_id } }).then(resp => {
                res.send(resp)
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStaus(406)
        }
    },

    checkCall(req, res, next) {
        if (req.user && req.user.id) {
            let id = req.user.id;
            if (req.params && req.params.caller_id) {
                id = req.params.caller_id;
            }
            return db.call_notification.findOne({ where: { receiver_id: id }, include: ['call_by'] })
                .then(async resp => {
                    if (resp) {
                        let obj = Object.create(resp);
                        return resp.destroy().then(() => {
                            return res.send({
                                success: true,
                                data: obj
                            })
                        }).catch(() => {
                            return res.send({
                                success: true,
                                data: obj
                            })
                        })

                    } else {
                        return res.send({
                            success: true,
                            data: null
                        })
                    }
                }).catch(error => {
                    return res.status(200).send({
                        status: false,
                        errors: error
                    })
                })
        } else {
            return res.sendStaus(406)
        }

    },
    setCallNotify(req, res, next) {
        if (req.user && req.user.id) {
            let data = req.body;
            data['caller_id'] = req.user.id;
            db.call_notification.create(data).then(resp => {
                res.send({
                    status: true,
                    data: resp
                })
            }).catch(error => {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                })
            })
        } else {
            res.sendStaus(406)
        }
    }

}
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
// const btoa = require('btoa');
// const { getLimitOffset, limit } = require('../../commons/paginator');
// const { response, errorResponse } = require('../../commons/response');
// const { generateToken } = require('../../commons/helper');
// const { crmTrigger } = require('../../commons/crmTrigger');
// const config = require(__dirname + '/../../config/config.json');
// const { verifyFamilyMember } = require('../../commons/patientMiddleware')
// const { allowedFamilyMembers } = require('../../commons/allowedFamilyMembers');

async function syncSteps(steps, meta) {
    let promises = [];
    steps.forEach(element => {
        let date = new Date(element.date)
        promises.push(
            db.userMedicalHistory.findOrCreate({
                where: {
                    user_id: meta.user_id,
                    dated: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    class: 'walking',
                    device_type: meta.device_type,
                    device_macAddress: meta.device_macAddress
                }
            }).then(re => {
                re[0].update({
                    response: {
                        target_steps: element.target_steps,
                        walked_steps: element.walked_steps,
                        calories: element.calories,
                        distance: element.distance
                    },
                    added_by: meta.user_id,
                    device_id: meta.device_id || null,
                })
                return re[0]
            }).catch(e => {})
        )
    });

    return Promise.all(promises)

}
async function syncBp(bps, meta) {
    let promises = [];
    bps.forEach(element => {
        let date = new Date(element.date)
        promises.push(
            db.userMedicalHistory.findOrCreate({
                where: {
                    user_id: meta.user_id,
                    dated: date,
                    class: 'blood_pressure',
                    device_type: meta.device_type,
                    device_macAddress: meta.device_macAddress
                }
            }).then(re => {
                re[0].update({
                    response: {
                        dystolic: element.dystolic,
                        systolic: element.systolic,
                        heart_rate: element.heart_rate,
                        unit: (element.unit || 'mmHg')
                    },
                    added_by: meta.user_id,
                    device_id: meta.device_id || null,
                })
                return re[0]
            }).catch(e => {})
        )
    });

    return Promise.all(promises)

}
async function syncHr(hrs, meta) {
    let promises = [];
    hrs.forEach(element => {
        let date = new Date(element.date)
        promises.push(
            db.userMedicalHistory.findOrCreate({
                where: {
                    user_id: meta.user_id,
                    dated: date,
                    class: 'heart_rate',
                    device_type: meta.device_type,
                    device_macAddress: meta.device_macAddress
                }
            }).then(re => {
                re[0].update({
                    response: {
                        avg: element.avg,
                        min: element.min,
                        max: element.max,
                        real_time_value: element.real_time_value
                    },
                    added_by: meta.user_id,
                    device_id: meta.device_id || null,
                })
                return re[0]
            }).catch(e => {})
        )
    });

    return Promise.all(promises)

}
async function syncTemp(temps, meta) {
    let promises = [];
    temps.forEach(element => {
        let date = new Date(element.date)
        promises.push(
            db.userMedicalHistory.findOrCreate({
                where: {
                    user_id: meta.user_id,
                    dated: date, //new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    class: 'temperature',
                    device_type: meta.device_type,
                    device_macAddress: meta.device_macAddress
                }
            }).then(re => {
                re[0].update({
                    response: {
                        temperature: element.temperature,
                        unit: (element.unit || '')
                    },
                    added_by: meta.user_id,
                    device_id: meta.device_id || null,
                })
                return re[0]
            }).catch(e => {})
        )
    });

    return Promise.all(promises)

}
async function syncSleep(sleeps, meta) {
    let promises = [];
    sleeps.forEach(element => {
        let date = new Date(element.date)
        promises.push(
            db.userMedicalHistory.findOrCreate({
                where: {
                    user_id: meta.user_id,
                    dated: date, //new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    class: 'sleep',
                    device_type: meta.device_type,
                    device_macAddress: meta.device_macAddress
                }
            }).then(re => {
                re[0].update({
                    response: {
                        deep: element.deep,
                        light: element.light,
                        sleep_hrs: element.sleep_hrs,
                        awake_hrs: element.awake_hrs,
                    },
                    added_by: meta.user_id,
                    device_id: meta.device_id || null,
                })
                return re[0]
            }).catch(e => {})
        )
    });

    return Promise.all(promises)

}
async function syncSpo2(spo2s, meta) {
    let promises = [];
    spo2s.forEach(element => {
        let date = new Date(element.date)
        promises.push(
            db.userMedicalHistory.findOrCreate({
                where: {
                    user_id: meta.user_id,
                    dated: date,
                    class: 'spo2',
                    device_type: meta.device_type,
                    device_macAddress: meta.device_macAddress
                }
            }).then(re => {
                re[0].update({
                    response: {
                        spo2: element.spo2,
                    },
                    added_by: meta.user_id,
                    device_id: meta.device_id || null,
                })
                return re[0]
            }).catch(e => {})
        )
    });

    return Promise.all(promises)

}

module.exports = {
    syncWatch: async(req, res, next) => {
        let data = req.body || {}
        let meta = {
            device_id: data.device_id,
            device_type: data.device_type,
            device_macAddress: data.device_macAddress,
            user_id: req.user.id
        }
        return Promise.all([
            syncSteps(data.walking || [], meta),
            syncBp(data.bp || [], meta),
            syncHr(data.hr || [], meta),
            syncTemp(data.temp || [], meta),
            syncSleep(data.sleep || [], meta),
            syncSpo2(data.spo2 || [], meta),
        ]).then(r => res.send({ status: true })).catch(e => res.send({ status: false, error: `${e}` }))
    },
    getWatchData: async(req, res, next) => {
        let where = {
            user_id: req.user.id,
            device_type: {
                [Op.ne]: "Manual"
            }
        };
        let query = req.query || {};
        if (!!query.type) {
            where.class = query.type
        } else {
            where.class = {
                [Op.in]: ['walking', 'heart_rate', 'blood_pressure', 'temperature', 'sleep', 'spo2']
            }
        }
        if (!!query.device_type) {
            where.device_type = query.device_type
        }
        if (!!query.device_type) {
            where.device_type = query.device_type
        }
        if (!!query.device_macAddress) {
            where.device_type = query.device_macAddress
        }
        if (!!query.device_id) {
            where.device_type = query.device_id
        }
        if (!!query.from) {
            where.dated = {
                [Op.gte]: new Date(query.from)
            }
        }
        if (!!query.to) {
            where.dated = {
                [Op.lte]: new Date(query.to)
            }
        }
        db.userMedicalHistory.findAll({
            where,
            order: [
                ['dated', 'DESC']
            ]
        }).then(re => {
            let resp = { walking: [], heart_rate: [], blood_pressure: [], temperature: [], sleep: [], spo2: [] }
            re.forEach(element => {
                if (!!!resp[element.class]) resp[element.class] = []
                resp[element.class].push({
                    ...element.response,
                    date: element.dated,
                    device_id: element.device_id,
                    device_type: element.device_type,
                    device_macAddress: element.device_macAddress
                })
            });
            res.send(resp)
        }).catch(e => res.status(400).send({ status: false, error: e }))
    },
    syncWeather: async(req, res, next) => {
        let userid = req.user.id;
        let data = req.body;
        db.weather.findOrCreate({
            where: { user_id: userid }
        }).then(async(r) => {
            await r[0].update(data);
            res.send({ status: true })
        }).catch(e => {
            res.status(500).res({ status: false, e: e, message: `${e}` })
        })
    },
    getWeather: async(req, res, next) => {
        let userid = req.user.id;
        db.weather.findOne({
            where: { user_id: userid }
        }).then(r => {
            res.send(r)
        }).catch(e => {
            res.status(500).res({ status: false, e: e, message: `${e}` })
        })
    },
    syncDeviceStatus: async(req, res, next) => {
        let userid = req.user.id;
        let data = req.body;
        db.device_status.findOrCreate({
            where: { user_id: userid }
        }).then(async(r) => {
            await r[0].update(data);
            res.send({ status: true })
        }).catch(e => {
            res.status(500).res({ status: false, e: e, message: `${e}` })
        })
    },
    getDeviceStatus: async(req, res, next) => {
        let userid = req.user.id;
        db.device_status.findOne({
            where: { user_id: userid }
        }).then(r => {
            res.send(r)
        }).catch(e => {
            res.status(500).res({ status: false, e: e, message: `${e}` })
        })
    }
}
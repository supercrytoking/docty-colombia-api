const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { user, family, sequelize } = require("../models");
const { upload } = require('../commons/fileupload');
const { getClinicOfUser } = require('../commons/helper');
const static = require('../config/static.json');

async function setCoporateName(userid) {
    let corporate = null;
    let ss = `SELECT u.company_name, u.id FROM customers c,users u, user_roles ur WHERE c.user_id = u.id AND ur.user_id = c.user_id AND ur.role_id = 13 AND c.customer = ${userid}`
    corporate = await db.sequelize.query(ss).spread((r, m) => r[0]);
    if (!!corporate) {
        return { company_name: corporate.company_name, id: corporate.id }
    }
    return null;
}

module.exports = {
    async mycontacts(req, res, next) {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.query && req.query.user_id) user_id = req.query.user_id;
            user.scope('publicInfo', 'contactInfo').findByPk(user_id, { include: ['insurance'] }).then(async(resp) => {
                let famAccess = true
                let fam = [];
                if (req.user.role == 5) {
                    famAccess = !!(await db.customer.findOne({ where: { customer: user_id, family_access: 1, user_id: req.user.id } }));
                }
                if (!!famAccess) {
                    fam = await resp.getFamilies({
                        include: [{
                            model: db.family_access,
                            as: 'permissions',
                            where: { user_id },
                            required: false
                        }]
                    });
                }

                let respnse = JSON.parse(JSON.stringify(resp));
                if (req.user.role == 2 || req.user.role == 5) {
                    let sq1 = `SELECT um.json_data FROM customers c
            JOIN usermeta um ON um.user_id=c.user_id AND 'key' = "networkVisibility"
            WHERE c.customer = ${req.user.id} OR  c.user_id = ${req.user.id} LIMIT 1`;
                    sq1 = sq1.replace(/\'/g, '`')
                    let ntc = await db.sequelize.query(sq1).spread((r, m) => (r[0] || {})).catch(e => { return {} });
                    if (!!ntc && !!ntc.json_data)
                        respnse.patientCloseEnvironment = ntc.json_data.patientCloseEnvironment
                }
                let faml = []
                fam
                    .forEach(async(r) => {
                        r = r.toJSON();
                        if (!!r.user) {
                            faml.push({
                                ...r.user,
                                relation: r.relation,
                                permissions: r.permissions ? r.permissions.permissions : {},
                                allow_access: r.allow_access,
                                patientCloseEnvironment: !!respnse.patientCloseEnvironment,
                                corporate: await setCoporateName(r.user.id)
                            })
                        }
                    });
                let parents = await db.user_kindred.findOne({
                    where: { member_id: req.user.id },
                    include: [{
                        model: db.user,
                        as: 'parent',
                        include: [{
                            model: db.family_access,
                            as: 'permissions',
                            where: { user_id },
                            required: false
                        }]
                    }]
                });
                if (!!parents && !!parents.parent) {
                    let parent = JSON.parse(JSON.stringify(parents.parent));
                    try {
                        parent['relation'] = static.reverseRelation[resp.gender][parents.relation] || parents.relation
                    } catch (error) {
                        parent['relation'] = parents.relation
                    }
                    parent['isParent'] = true
                    parent['permissions'] = parent.permissions && parent.permissions.permissions ? parent.permissions.permissions : {}
                    parent['corporate'] = await setCoporateName(parent.id);
                    faml.push(parent)
                }

                respnse['family'] = faml;
                respnse['corporate'] = await setCoporateName(respnse.id)
                res.send(respnse);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async contactPerticulars(req, res, next) {
        let id = req.user.id;
        let attr = ['title'];
        if (req.lang == 'es') {
            attr = [
                ['title_es', 'title']
            ];
        }
        let include = [
            // 'charges',
            // 'availability', 
            'practice',
            {
                model: db.user_service,
                as: 'services',
                include: [{
                    model: db.speciality,
                    as: 'speciality',
                    attributes: attr
                }]
            },
            'education', 'user_role',
            'user_location', 'rating_summary'
        ];
        if (req.user && req.user.id) {
            if (req.query && req.query.id) {
                id = req.query.id;
            }
            if (req.query && req.query.includes) {
                include = req.query.includes.split(',');
            }
            if (req.query && req.query.role == '5') {
                include.push({
                    model: db.user_department,
                    as: 'user_department',
                    // paranoid: false,
                    required: false,
                    include: ['department', 'locations']
                });
            }
            if (req.query && req.query.dated) {
                let endDate = new Date();
                endDate.setHours(0);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                endDate.setDate(endDate.getDate() + 1)

                include.push({
                    model: db.schedule,
                    where: {
                        start: {
                            [Op.gte]: new Date(req.query.dated)
                        },
                        end: {
                            [Op.lte]: new Date(endDate)
                        },
                        calendarId: {
                            [Op.in]: [4]
                        },
                        state: {
                            [Op.ne]: 'Busy'
                        }
                    },
                    required: false,
                    attributes: ["id", "start", "end"],
                    as: 'schedule',
                });
            }
            let address = await db.address.findOne({ where: { user_id: id, family_id: 0 } });
            let insurance = await db.user_insurance.findOne({ where: { user_id: id, member_id: 0 } });
            let career_snap = await module.exports.getCArrierSnap(id);
            let favorite = await db.my_favorite.findOne({ where: { user_id: req.user.id, provider_id: id } })
            user
            // .scope('publicInfo', 'publicCompanyInfo')
                .findByPk(id, {
                include: include
            }).then(async(resp) => {
                // if (!!need_company) {
                var patient_id = req.user.id;
                if (req.query && req.query.patient_id) patient_id = req.query.patient_id;
                var family_id = 0;
                if (req.query && req.query.family_id) family_id = req.query.family_id;
                var patient_user_insurance = await db.user_insurance.findOne({ where: { user_id: patient_id, member_id: family_id } });
                let json = JSON.parse(JSON.stringify(resp))
                await getClinicOfUser(json, patient_user_insurance ? patient_user_insurance.company : null);
                // }

                res.send({...json, career_snap, address, insurance, favorite: (!!favorite), patient_insurance: patient_user_insurance != null ? patient_user_insurance.insurance_provider : null });
            }).catch(err => {
                res.send({
                    status: false,
                    error: `${err}`,
                    errors: err
                })
            })
        } else {
            res.sendStatus(406)
        }
    },
    async getCArrierSnap(id) {
        return db.user_practice.findAll({ where: { user_id: id } }).then(practice => {
            if (practice.length) {
                practice.sort((a, b) => {
                    let first = new Date((a.from || ''));
                    let second = new Date((b.from || ''));
                    return (first - second)
                })
                let firstPractice = practice[0];
                let lastPractice = practice.pop();
                let experience = ((Date.now() - new Date(firstPractice.from || '').getTime()) / (365 * 24 * 60 * 60 * 1000)).toFixed();
                return { experience, field: lastPractice.field, title: lastPractice.title }
            }
            return {};
        })
    },
    async myProviders(req, res, next) {
        if (req.user && req.user.id) {

            let where = {
                status: {
                    [Op.gt]: 0
                }
            };
            // let lat = req.body.latitude || null;
            // let lng = req.body.longitude || null;

            // let dist = 20;
            // if (req.body.distance) {
            //   dist = req.body.distance
            // }

            if (req.body.lats && req.body.lngs) {
                let lats = req.body.lats;
                let lngs = req.body.lngs;
                where = {
                    status: {
                        [Op.gt]: 0
                    },
                    [Op.or]: [{
                            '$user_location.latitude$': {
                                [Op.between]: lats
                            },
                            '$user_location.longitude$': {
                                [Op.between]: lngs
                            },
                        },
                        {
                            '$address.latitude$': {
                                [Op.between]: lats
                            },
                            '$address.longitude$': {
                                [Op.between]: lngs
                            },
                        },
                    ]
                };
            }
            let provider_type = [4, 5, 6];
            if (req.query) {
                if (!!req.query.doctors) {
                    provider_type.push(1)
                }
                if (!!req.query.nurses) {
                    provider_type.push(3)
                }

            }

            // if (lat && lng) {
            //   where = {
            //     status: { [Op.gt]: 0 },
            //     [Op.or]: [
            //       db.sequelize.literal(`3959 *
            //     ACOS(COS(RADIANS(${lat})) * 
            //     COS(RADIANS(user_location.latitude)) * 
            //     COS(RADIANS(user_location.longitude) - 
            //     RADIANS(${lng})) + 
            //     SIN(RADIANS(${lat})) * 
            //     SIN(RADIANS(user_location.latitude ))) < ${dist}`),
            //       db.sequelize.literal(`3959 *
            //     ACOS(COS(RADIANS(${lat})) * 
            //     COS(RADIANS(address.latitude)) * 
            //     COS(RADIANS(address.longitude) - 
            //     RADIANS(${lng})) + 
            //     SIN(RADIANS(${lat})) * 
            //     SIN(RADIANS(address.latitude ))) <  ${dist}`)
            //     ]
            //   };
            // }

            db.user.findAll({
                where,
                attributes: ['company_name', 'phone_number', 'email', 'website', 'picture', 'picture', 'dob', 'id', 'overview'],
                include: [
                    'user_location', 'rating_summary', 'offer',
                    {
                        model: db.my_favorite,
                        as: 'favorite_of',
                        left: false,
                        // paranoid: false,
                        required: false,
                        where: { user_id: req.user.id }
                    },
                    {
                        model: db.address,
                        // where: { family_id: 0 },
                        as: 'address'
                    },
                    {
                        model: db.user_role,
                        where: {
                            role_id: {
                                [Op.in]: provider_type
                            }
                        },
                        as: "user_role"
                    }
                ]
            }).then(resp => {
                res.send(resp)
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                })
            })

        } else {
            res.sendStatus(406)
        }
    }
}
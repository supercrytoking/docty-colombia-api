const Sequelize = require('sequelize');
const { crmTrigger } = require('../commons/crmTrigger');
const { generateToken } = require('../commons/helper');
const config = require(__dirname + '/../config/config.json');
const Op = Sequelize.Op;
const db = require("../models");
const { upload } = require('../commons/fileupload');
const { addActivityLog } = require('./activityLog');
var infermedicHeaders = config.infermedicHeaders;
var rp = require('request-promise');
const { json } = require('body-parser');
const { allowedFamilyMembers } = require('../commons/allowedFamilyMembers');
async function getRecommendedSpeciality(rec) {
    if (!!rec && !!rec.recommended_specialist) {
        let name = rec.recommended_specialist.name;
        let spec = await db.speciality.findOne({
            where: {
                [Op.or]: [
                    { title: name },
                    { title_es: name },
                    {
                        tags: {
                            [Op.like]: `%${name}%`
                        }
                    }
                ]
            }
        });
        if (!!spec) {
            return spec.id;
        } else {
            return null;
        }
    } else {
        return null;
    }
}

module.exports = {
    async addAnalysis(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            if (!!!data.user_id) data['user_id'] = req.user.id;
            data['added_by'] = req.user.id;
            try {
                let resp = {};
                if (data.id)
                    resp = await db.symptom_analysis.upsert(data, { returning: true });
                else {
                    try {
                        let header = JSON.parse(JSON.stringify(infermedicHeaders));
                        if (req.lang)
                            header.Model = `infermedica-${req.lang}`;
                        let options = {
                            uri: 'https://api.infermedica.com/v3/recommend_specialist',
                            method: 'post',
                            body: {
                                sex: data.sex,
                                age: { value: data.age, unit: 'year' },
                                evidence: data.evidence
                            },
                            headers: header,
                            json: true
                        };
                        let rec = await rp(options);
                        if (rec) {
                            rec = JSON.parse(JSON.stringify(rec));
                            data.tirage = await {...data.tirage, ...rec };
                            data['speciality_id'] = await getRecommendedSpeciality(rec);
                        }
                        await db.symptom_analysis.update({
                            changed_user_id: req.user.id,
                            symptom_status: {
                                remarks: 'SYMPTOMS.NEW_RECORD_AVAILABLE',
                                at: new Date(),
                                is_normal: false
                            }
                        }, {
                            where: {
                                changed_user_id: null,
                                changed_admin_id: null,
                                user_id: data.user_id,
                            }
                        });
                        resp = await db.symptom_analysis.create(data);
                        var customer = await db.customer.findOne({ where: { customer: data['user_id'] } });
                        if (customer) {
                            await db.symptom_analysis_clinic.create({ analysis_id: resp.id, clinic_id: customer.user_id });
                        }

                        // email trigger

                        let returnUrlD = `/symptoms/history/${resp.id}`;

                        //
                        var token_expire = new Date();
                        token_expire.setDate(token_expire.getDate() + 1);
                        var hash;
                        var tokenObj;

                        let user = await db.user.findByPk(req.user.id);
                        if (data.family_id) {
                            var user_family = await db.user_family.findByPk(data.family_id);
                            var returnUrlFamily = `/symptoms/history/${resp.id}/${data.family_id}`;

                            hash = await generateToken({ name: user_family.first_name, group: 'client', role: 2 });;
                            tokenObj = await db.token.create({ userId: req.user.id, token: hash, expired_at: null, login_as: data.family_id, is_for_link: true });
                            tokenObj.update({ expiredAt: token_expire });

                            let link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrlFamily)}`;
                            crmTrigger('Symptom_checker_Results_Family', { email: user_family.email, username: user.fullName, family_member: user_family.fullName, link: link }, req.lang || 'en');
                        }

                        hash = await generateToken({ name: user.first_name, group: 'client', role: 2 });
                        tokenObj = await db.token.create({ userId: req.user.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
                        tokenObj.update({ expiredAt: token_expire });

                        let link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrlD)}`;
                        crmTrigger('Symptom_checker_Results', { email: user.email, username: user.fullName, link: link }, user.lang || req.lang || 'en');

                    } catch (e) { console.log(e); }
                }
                addActivityLog({ user_id: req.user.id, type: 'New Symptom Checker', details: `` });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                console.log(error);
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    async allAnalysys(req, res, next) {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.query && req.query.user_id) {
                user_id = req.query.user_id;
            }
            let patients = [req.user.id];
            let allowedFamily = await allowedFamilyMembers(req.user.id, 'SymptomsHistoryRetrieve');
            patients = patients.concat(allowedFamily);
            let where = {};

            if (req.user.role == 2) {
                where = {
                    user_id: {
                        [Op.in]: patients
                    }
                }
            } else {
                where = {
                    [Op.or]: [
                        { added_by: user_id },
                        { user_id: user_id },
                        // { '$permitedBy.permitted_to$': user_id }
                    ]
                };
            }
            let attributes = ['id', 'title', 'symbol'];
            if (req.lang && req.lang == 'es') {
                attributes = ['id', ['title_es', 'title'], 'symbol'];
            }
            let include = [
                'userInfo',
                // 'permitedBy',
                {
                    model: db.booking,
                    as: 'booking',
                    attributes: []
                },
                {
                    model: db.speciality,
                    as: 'speciality',
                    attributes: attributes
                }, {
                    model: db.user,
                    as: 'changed_user',
                    attributes: ['first_name', 'last_name', 'middle_name', 'fullName', 'company_name']
                },
                {
                    model: db.admin,
                    as: 'changed_admin',
                    attributes: ['first_name', 'last_name', 'fullName']
                }
            ];
            let whereS = null;
            if (req.query && req.query.status_changed == 1) {
                whereS = {
                    [Op.or]: [{
                            changed_admin_id: {
                                [Op.ne]: null
                            }
                        },
                        {
                            changed_user_id: {
                                [Op.ne]: null
                            }
                        },
                    ]
                };
            }
            if (req.query && req.query.status_changed == 0) {
                whereS = {
                    [Op.and]: [{
                            changed_admin_id: {
                                [Op.eq]: null
                            }
                        },
                        {
                            changed_user_id: {
                                [Op.eq]: null
                            }
                        },
                    ],
                };
            }
            if (!!whereS) {
                where = {
                    [Op.and]: [where, whereS]
                };
            }

            db.symptom_analysis.findAll({
                where: where,
                include: include,
                attributes: {
                    include: [
                        [Sequelize.col('booking.id'), 'booking_id']
                    ]
                },
                order: [
                    ['createdAt', 'desc']
                ]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    async analysys(req, res, next) {

        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.query && req.query.user_id) {
                user_id = req.query.user_id;
            }
            let where = {
                [Op.or]: [
                    { added_by: user_id },
                    { user_id: user_id },
                    // { '$permitedBy.permitted_to$': user_id }
                ]
            };

            if (req.params && req.params.id) {
                where.id = req.params.id;
            }
            let attributes = ['id', 'title', 'symbol'];
            if (req.lang && req.lang == 'es') {
                attributes = ['id', ['title_es', 'title'], 'symbol'];
            }
            let include = [
                'userInfo', "changed_user", "changed_admin",
                {
                    model: db.speciality,
                    as: 'speciality',
                    required: false,
                    attributes: attributes
                }
            ];

            db.symptom_analysis.findOne({ where, include: include }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }

    },
    async analysys_patient(req, res, next) {
        if (req.user && req.user.id) {
            let where = { id: req.params.id };

            db.symptom_analysis.findOne({ where }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }

    },
    async interview(req, res, next) {
        if (req.user && req.user.id) {
            let where = {
                user_id: req.user.id
            };
            if (req.params && req.params.id) {
                where.analysis_id = req.params.id;
            }
            db.patient_symptom_interview.findOne({ where: where }).then(resp => {
                if (resp)
                    return res.send(resp);
                else
                    return module.exports.infermediacaInterview(req, res, next);
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    async interview_patient(req, res, next) {
        if (req.user && req.user.id) {
            let where = {
                analysis_id: req.params.id
            };

            db.patient_symptom_interview.findOne({ where: where }).then(resp => {
                if (resp) {
                    return res.send(resp);
                } else {
                    return module.exports.infermediacaInterview(req, res, next);
                }
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    async saveInterview(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['user_id'] = req.user.id;
            try {
                // const [rec,cre] = await db.patient_symptom_interview.upsert(data,{ returning: true });
                db.patient_symptom_interview.upsert(data, { individualHooks: true }).then((resp) => {
                    res.send({
                        status: true,
                        data: resp
                    });
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    });
                });

            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: `${error}`
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    infermediacaInterview: async(req, res, next) => {
        let header = JSON.parse(JSON.stringify(infermedicHeaders));
        if (req.lang)
            header.Model = `infermedica-${req.lang}`;
        let evidence = [];
        let aCond = [];
        let analysis = await db.symptom_analysis.findByPk(req.params.id, {
            // attributes: ['id', 'evidence', 'user_id', 'conditions', 'sex', 'age']
        });
        if (!!!analysis) {
            return res.status(400).send({ m: 'l' });
        } else {
            evidence = analysis.evidence || [];
            if (typeof evidence === "string")
                evidence = JSON.parse(evidence);
            aCond = analysis.conditions || [];
            if (typeof aCond == "string")
                aCond = JSON.parse(aCond);
        }
        let queryArr = evidence.map(e => e.id);
        // let options1 = {
        //     uri: 'https://api.infermedica.com/v3/recommend_specialist',
        //     method: 'post',
        //     body: {
        //         sex: analysis.sex, age: { value: analysis.age, unit: 'year' }, evidence
        //     },
        //     headers: header,
        //     json: true
        // };
        let options2 = {
            uri: `https://api.infermedica.com/v3/concepts?ids=${queryArr.join(',')}`,
            headers: header,
            json: true
        };
        let options3 = {
            uri: `https://api.infermedica.com/v3/conditions?age.value=${analysis.age}`,
            headers: header,
            json: true
        };
        Promise.all([
            // rp(options1),
            rp(options2),
            rp(options3)
        ]).then(async(data) => {
            // const rf = await data[0] || {};
            const symptoms = data[0] || [];
            const conditions = data[1] || [];
            let praparedData = {
                present: [],
                absent: [],
                unknown: [],
                symptoms: [],
                analysis_id: analysis.id,
                user_id: analysis.user_id
            };
            evidence.forEach(element => {
                let symptom = symptoms.find(e => e.id == element.id);
                if (symptom) {
                    if (!!element.initial || (!!element.source && element.source == "initial")) {
                        praparedData.symptoms = praparedData.symptoms || [];
                        praparedData.symptoms.push(symptom);
                    } else {
                        if (element.choice_id == 'present') {
                            praparedData.present = praparedData.present || [];
                            praparedData.present.push(symptom);
                        }
                        if (element.choice_id == 'absent') {
                            praparedData.absent = praparedData.absent || [];
                            praparedData.absent.push(symptom);
                        }
                        if (element.choice_id == 'unknown') {
                            praparedData.unknown = praparedData.unknown || [];
                            praparedData.unknown.push(symptom);
                        }
                    }
                }
            });
            aCond.forEach((element, i) => {
                const id = element.id;
                const cond = conditions.find(e => e.id == id);
                if (cond) {
                    aCond[i] = Object.assign(aCond[i], cond);
                }
            });

            await analysis.update({ conditions: aCond });
            db.patient_symptom_interview.create(praparedData)
                .then(resp => res.send(resp))
                .catch(err => res.status(400).send({
                    success: false,
                    errors: `${err}`
                }));
        }).catch(e => res.status(400).send(e));
    }
};
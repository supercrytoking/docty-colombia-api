const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const btoa = require('btoa');
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { generateToken } = require('../../commons/helper');
const { crmTrigger } = require('../../commons/crmTrigger');
const config = require(__dirname + '/../../config/config.json');
const { verifyFamilyMember } = require('../../commons/patientMiddleware')
const { allowedFamilyMembers } = require('../../commons/allowedFamilyMembers');


module.exports = {
    addCovidCheckerResponse: async(req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            if (!!!data['user_id']) data['user_id'] = req.user.id;
            if (!!!data['added_by']) data['added_by'] = req.user.id;
            if (data.user_id != req.user.id) {
                let p = await verifyFamilyMember(req, data.user_id, req.user.id);
                if (!!!p) {
                    return res.status(409).send({
                        success: false,
                        status: false,
                        data,
                        errors: serverMessage('SERVER_MESSAGE.UN_AUTHOROZED_ACCESS', req.lang)
                    });
                }
            }

            db.covid_checker.create(data).then(async resp => {
                try {
                    let returnUrlD = `/covid-self-assessment/history/${btoa(resp.id)}`;
                    var token_expire = new Date();
                    token_expire.setDate(token_expire.getDate() + 1);
                    var hash;
                    var tokenObj;

                    let user = await db.user.findByPk(req.user.id);
                    let family_id = null;
                    if (data.user_id !== req.user.id) {
                        family_id = data.user_id;
                    }
                    if (family_id) {
                        var user_family = await db.user.scope('familyInfo').findByPk(family_id);
                        var hash = await generateToken({ name: user_family.first_name, group: 'client', role: 2 });
                        tokenObj = await db.token.create({ userId: req.user.id, token: hash, expired_at: null, login_as: data.family_member_id, is_for_link: true });
                        tokenObj.update({ expiredAt: token_expire });

                        let link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrlD)}`;
                        crmTrigger('Covid_symptom_checker_Results_Family', { email: user_family.email, username: user.fullName, family_member: user_family.fullName, link: link }, req.lang || 'en')
                    }

                    var hash = await generateToken({ name: user.first_name, group: 'client', role: 2 });
                    tokenObj = await db.token.create({ userId: req.user.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
                    tokenObj.update({ expiredAt: token_expire });

                    let link = `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrlD)}`;
                    crmTrigger('Covid_symptom_checker_Results', { email: user.email, username: user.fullName, link: link }, user.lang || req.lang || 'en')

                } catch (e) { console.log(e); }

                response(res, resp);
            }).catch(err => errorResponse(res, err));


        } else {
            res.sendStatus(403);
        }
    },
    getAllCovidResponse: async(req, res, next) => {
        let patients = [req.user.id];
        let allowedFamily = await allowedFamilyMembers(req.user.id, 'symptomsHistoryRetrieve');
        patients = patients.concat(allowedFamily);
        let where = {};
        if (req.user.role == 2) {
            where = { user_id: {
                    [Op.in]: patients } }
        } else {
            where = {
                [Op.or]: [
                    { user_id: req.user.id },
                    { added_by: req.user.id },
                    // { '$permitedBy.permitted_to$': req.user.id }
                ]
            }
        }

        db.covid_checker.findAll({
            where: where,
            include: ['userInfo',
                // 'permitedBy'
            ],
            order: [
                ['createdAt', 'desc']
            ]
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err));
    },
    getCovidResponse: async(req, res, next) => {
        db.covid_checker.findOne({
            where: {
                id: req.params.id,
                [Op.or]: [
                    { user_id: req.user.id },
                    { added_by: req.user.id },
                    // { '$permitedBy.permitted_to$': req.user.id }
                ]
            },
            include: ['userInfo', 'changed_admin', 'changed_user',
                // 'permitedBy'
            ]
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err));
    }
}
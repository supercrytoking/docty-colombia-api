const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { crmTrigger } = require('../../commons/crmTrigger');

const config = require(__dirname + '/../../config/config.json');

module.exports = {
    async add(req, res, next) {
        let data = req.body;
        if (req.user && req.user.id) {
            data['assigned_by'] = req.user.id;
            try {
                await db.user_profile_reviewer.destroy({ where: { user_id: data.user_id } });
                let resp;
                if (data.admin_id) {
                    resp = await db.user_profile_reviewer.upsert(data);
                    var user = await db.user.findOne({ where: { id: data.user_id }, include: ['associatedTo'] });
                    var admin = await db.admin.findOne({ where: { id: data.admin_id } });
                    let role = await db.user_role.findOne({ where: { user_id: data.user_id }, include: ['role_info'] });
                    let user_type = '';
                    if (role && role.role_info) {
                        user_type = role.role_info.role;
                    }
                    crmTrigger('Reviewer_Assigned', { email: user.email, subject: 'Docty Health Care: Profile Reviewer Assigned', reviewer: admin.fullName, userName: user.fullName, user: user.fullName, user_type: user_type }, user.lang || req.lang || 'en');
                    crmTrigger('New_Lead_Assigned', { email: admin.email, subject: 'Docty Health Care: New Lead Assigned', user: user.fullName, userName: admin.fullName, user_type: user_type }, admin.lang || req.lang || 'en');
                    if (user.associatedTo && user.associatedTo.user) {
                        var clinic = user.associatedTo.user;
                        crmTrigger('staff_reviwer_assigned', {
                            email: clinic.email, staff_name: user.fullName, staff_photo: user.picture, reviewer_name: admin.fullName, reviewer_photo: admin.picture, staff_email: user.email,
                            staff_profile_link: `${config.domains.clinic}/my-staff/view/${user.id}`,
                        }, clinic.lang || req.lang || 'en');
                    }
                }

                // else [CLEAR Reviewer]
                res.send({
                    status: true,
                    data: resp
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
    async remove(req, res, next) {
        if (req.user && req.user.id && req.body.id) {
            try {
                let resp = await db.user_profile_reviewer.destroy({ where: { user_id: req.body.user_id } });
                res.send({
                    status: true,
                    data: resp
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        }
        else {
            res.sendStatus(406);
        }
    },
    async assignedList(req, res, next) {
        if (req.user && req.user.id) {
            var user_id = req.user.id;
            if (req.query && req.query.admin_id) user_id = req.query.admin_id;
            var where = {
                status: 0,
                email_verified: 1,
                isSigned: true
            };
            if (req.query && req.query.status) { // all clients: approved user list
                where = {
                    status: req.query.status,
                    email_verified: 1,
                    isSigned: true
                };
            }

            db.user.findAll({
                where: where,
                include: [
                    {
                        model: db.user_role, as: 'user_role',
                        where: { role_id: { [Op.ne]: 2 } },
                        left: true
                    },
                    {
                        model: db.associate,
                        as: 'associate',
                        require: false,
                        separate: true,
                        include: ['admin', 'user']
                    },
                    {
                        model: db.user_profile_reviewer,
                        as: 'reviewer',
                        where: {
                            [Op.or]: [
                                { admin_id: user_id },
                                { assigned_by: user_id },
                            ]
                        },
                        include: ['assigned']
                    },
                ]
            })
                .then(resp => res.send(resp))
                .catch(error => res.status(400).send({
                    status: false,
                    errors: error
                }));
        }
        else {
            res.sendStatus(406);
        }
    },
};
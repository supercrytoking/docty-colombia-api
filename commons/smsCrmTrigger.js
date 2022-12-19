const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { getSms, getSmsTemplate } = require('./getSmsTemplate');
const { sendSms } = require('../jobs/sms');
const { queueSms } = require('../commons/jobs');


async function getClinicID(phone_number) {
    try {
        if (phone_number == null) return null;
        phone_number = phone_number.trim();
        phone_number = phone_number.replace(/[^a-z\d\s]+/gi, "");
        var user = await db.user.findOne({
            where: Sequelize.where(Sequelize.fn("concat", Sequelize.col("user.isd_code"), Sequelize.col("user.phone_number")), { [Op.like]: phone_number }),
            include: [
                'associatedTo',
                'customeredTo',
                {
                    model: db.user_role,
                    as: 'user_role',
                    required: true
                }
            ]
        });
        user = JSON.parse(JSON.stringify(user));

        if (user == null) return null;

        if (user.user_role.role_id == 5) {//if clinic
            return user.id;
        }

        if (user.user_role.role_id == 1 && user.associatedTo && user.associatedTo.user) {//if staff doctor
            return user.associatedTo.user.id;
        }
        if (user.user_role.role_id == 2 && user.customeredTo && user.customeredTo.user) {//if customed patient
            return user.customeredTo.user.id;
        }
        return null;
    } catch (e) {
        console.log(e);
    }
    return null;
}

module.exports = {
    smsTrigger: async (trigger_name, data, lang = 'en', queued) => {

        var templateWhere = { user_id: 0, language: lang };
        var clinic_id = await getClinicID(data.to);
        if (clinic_id) templateWhere = { user_id: { [Op.in]: [0, clinic_id] } };

        return db.sms_templates.findOne({
            where: templateWhere,
            attributes: ['id', 'title', 'message', 'user_id'],
            order: [['user_id', 'desc']],
            include: [
                {
                    model: db.sms_triggers,
                    as: 'trigger',
                    where: {
                        name: trigger_name
                    }
                }
            ]
        }).then(resp => {
            console.log(JSON.parse(JSON.stringify(resp)));
            if (resp == null) return;
            getSms(trigger_name, resp.message, data)
                .then((message) => {
                    if (!queued) {
                        sendSms({ job: message, to: data.to }).catch(error => {

                        });
                    } else {
                        queueSms({ to: data.to, message: message, notify_before: queued, time: data.time });
                    }
                }).catch((error) => {
                    console.log(error.status);
                });
        }).catch(err => {
            console.log(err);
        });
    },
    smsOtpTrigger: async (trigger_name, data, lang = 'en') => {
        var templateWhere = { user_id: 0, language: lang };
        var clinic_id = await getClinicID(data.to);
        if (clinic_id) templateWhere = { user_id: { [Op.in]: [0, clinic_id] } };
        return db.sms_templates.findOne({
            where: {
                language: lang
            },
            attributes: ['id', 'title', 'message'],
            include: [
                {
                    model: db.sms_triggers,
                    as: 'trigger',
                    where: {
                        name: trigger_name
                    }
                }
            ]
        }).then(async resp => {
            if (resp == null) {
                let msg = ''
                if (!!data.message) {
                    msg = data.message
                } else {
                    for (let key in data) {
                        msg += `${key} : ${data[key]}, `
                    }
                }
                return await sendSms({ job: msg, to: data.to });
            };
            getSmsTemplate(resp.message, data)
                .then(async (message) => {
                    return await sendSms({ job: message, to: data.to });
                }).catch((error) => {
                    return error;
                });
        }).catch(err => {
            console.log(err);
        });
    }
};
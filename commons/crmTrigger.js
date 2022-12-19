/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const staticConfig = require(__dirname + '/../config/static.json');
const config = require(__dirname + '/../config/config.json');
var FCM = require('fcm-node');
var fcm = new FCM(staticConfig.fcmServerKey);
const webpush = require('web-push');

var PUSH_NOTIFICATION_KEY = {
    "publicKey": "BGOgZjmgF2r4r1PV4naYgXqKGD21_8ZhgT3oFR-1bgoVnToNt9c0jfSpdwgso9507UVVj_ftgOD2iLRIVDvs0nU",
    "privateKey": "OR1ZD5cZsxb8RT3mX--M1tBsf2WQFYLksDfnHNDQnKc"
};

webpush.setVapidDetails('mailto:noreply@docty.ai', PUSH_NOTIFICATION_KEY.publicKey, PUSH_NOTIFICATION_KEY.privateKey);


const db = require("../models");
const { queueEmail, queueSms } = require('./jobs');
const { sendEmail, generateToken } = require('./helper');

var process_except = (data) => {
    try {
        let html = '';
        for (let key in data) {
            if (!!data[key]) {
                html += `<tr>
                <td>${key}</td>
                <td>${data[key]}</td>
            </tr>`;
            }
        }
        return `<table>${html}</table>`;
    } catch (e) {
        // console.log(e)
    }
};

var getHeaderFooter = async (lang, clinic_id) => {
    try {
        var where = {
            language: lang,
            user_id: 0
        };
        if (clinic_id) {
            where = {
                language: lang,
                user_id: { [Op.in]: [0, clinic_id] }
            }
        }
        return db.email_template.findAll({
            where: where,
            attributes: ['id', 'title', 'html'],
            order: [['user_id', 'desc']],
            include: [
                {
                    model: db.email_trigger,
                    as: 'trigger',
                    where: {
                        name: { [Op.in]: ['Email_Header', 'Email_Footer'] }
                    }
                }
            ]
        }).then(resp => {
            let res = JSON.parse(JSON.stringify(resp));
            let header = res.find(r => r.trigger && r.trigger.find(e => e.name.toLowerCase() == 'email_header')) || {};
            let footer = res.find(r => r.trigger && r.trigger.find(e => e.name.toLowerCase() == 'email_footer')) || {};
            return { header: cleanHtml(header.html || ''), footer: cleanHtml(footer.html || '') };
        }).catch(() => {
            return { header: '', footer: '' };
        });
    } catch (error) {
        return { header: '', footer: '' };
    }
};

function cleanHtml(html) {
    html = html.replace('<html>', '');
    html = html.replace('</html>', '');
    html = html.replace('<body>', '');
    html = html.replace('</body>', '');
    html = html.replace('<head>', '');
    html = html.replace('</head>', '');
    return html;
}

async function getClinicID(email) {

    var user = await db.user.findOne({
        attributes: ['id'],
        where: {
            email: { [Op.eq]: email }
        },
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
        return user.associatedTo.user.id
    }
    if (user.user_role.role_id == 2 && user.customeredTo) {//if customed patient
        return user.customeredTo.user_id
    }
    return null;

}

module.exports = {
    getMobilePushNotificationTemplate: async (trigger_name, data, lang = 'en') => {
        let attr = ['title', 'body'];
        if (lang == 'es') {
            attr = [['title_es', 'title'], ['body_es', 'body']];
        }
        var trigger = await db.email_trigger.findOne({
            where: {
                name: trigger_name
            },
            include: [
                {
                    model: db.email_trigger_notification,
                    as: 'notification',
                    attributes: attr,
                }
            ]
        });
        if (trigger == null) return {};
        if (!!!trigger.status) return null;
        if (trigger.notification == null) return {}
        trigger = JSON.parse(JSON.stringify(trigger))

        for (let key in data) {
            let str = "${" + key + "}";
            if (trigger.notification.title)
                trigger.notification.title = trigger.notification.title.split(str).join(data[key]); //replace All
            if (trigger.notification.body)
                trigger.notification.body = trigger.notification.body.split(str).join(data[key]); //replace All
        }
        return trigger.notification;
    },
    crmTrigger: async (trigger_name, data, lang = 'en') => {
        if (!!!data.email) {
            return Promise.resolve({})
        }
        if (lang == null) lang = 'en';
        let statisBlock = await getHeaderFooter(lang);
        let subject = data.subject || `docty.ai: ${trigger_name}`;
        if (data.email == null) return process_except(trigger_name, data, lang, 'data.email == null');

        var templateWhere = { user_id: 0 };
        var clinic_id = await getClinicID(data.email);
        if (clinic_id) templateWhere = { user_id: { [Op.in]: [0, clinic_id] } };

        return db.email_template.findAll({
            where: templateWhere,
            order: [['user_id', 'desc']],
            attributes: ['id', 'title', 'html', 'subject', 'language'],
            include: [
                {
                    model: db.email_trigger,
                    as: 'trigger',
                    where: {
                        name: trigger_name
                    }
                }
            ]
        }).then(listTemplate => {
            listTemplate = JSON.parse(JSON.stringify(listTemplate));

            var resp;
            let html = '';
            let template = '';
            var emailTemplateId = null;
            if (listTemplate && listTemplate[0] && listTemplate[0].trigger[0] && !!!listTemplate[0].trigger[0].status) {
                return;
            }
            if (!!!listTemplate) template = process_except(data);
            else if (listTemplate[0] == null) template = process_except(data);
            else resp = listTemplate.find(temp => temp.language == lang) || listTemplate[0];// find language matching template or used first

            if (resp && resp.subject) {
                subject = resp.subject;
                emailTemplateId = resp.id;
            }

            if (resp && resp.html) {
                template = resp.html;
            } else {
                template = process_except(data);
            }
            html = `<html><body>
                ${statisBlock.header}${cleanHtml(template)}${statisBlock.footer}
                </body></html>
                `;
            for (let key in data) {
                let str = "${" + key + "}";
                html = html.split(str).join(data[key]); //replace All
                subject = subject.split(str).join(data[key]); //replace All
            }
            return sendEmail(data.email, subject, { html: html }, emailTemplateId).then(resp => { }).catch(err => { console.log(err); });
        }).catch(err => {
            let table = process_except(data);
            let html1 = `<html><body>${statisBlock.header}${table}${statisBlock.footer}</body></html>`;
            return sendEmail(data.email, subject, { html: html1 }).then(resp => { }).catch(err => { console.log(err); });
        });
    },
    otpTrigger: async (trigger_name, data, lang = 'en') => {
        if (!!!data.email) {
            return Promise.resolve({})
        }
        if (lang == null) lang = 'en';
        // console.log('otpTrigger', trigger_name, data, lang);
        let subject = data.subject || `docty.ai: ${trigger_name}`;

        var templateWhere = { user_id: 0 };
        var clinic_id = await getClinicID(data.email);
        if (clinic_id) templateWhere = { user_id: { [Op.in]: [0, clinic_id] } };

        let statisBlock = await getHeaderFooter(lang, clinic_id);

        if (data.email == null) return process_except(trigger_name, data, lang, 'data.email == null');

        return db.email_template.findAll({
            where: templateWhere,
            order: [['user_id', 'desc']],
            attributes: ['id', 'title', 'html', 'subject', 'language', 'user_id'],
            include: [
                {
                    model: db.email_trigger,
                    as: 'trigger',
                    where: {
                        name: trigger_name
                    }
                }
            ]
        }).then(listTemplate => {
            listTemplate = JSON.parse(JSON.stringify(listTemplate));

            if (listTemplate && listTemplate[0] && listTemplate[0].trigger[0] && !!!listTemplate[0].trigger[0].status) {
                return;
            }
            let template = '';
            let html = '';
            let resp;
            var emailTemplateId = null;
            if (!!!listTemplate) template = process_except(data);
            else if (listTemplate[0] == null) template = process_except(data);
            else resp = listTemplate.find(temp => temp.language == lang) || listTemplate[0];// find language matching template or used first
            if (resp && resp.subject) {
                subject = resp.subject;
                emailTemplateId = resp.id
            }
            if (resp && resp.html) {
                template = resp.html;
                for (let key in data) {
                    let str = "${" + key + "}";
                    template = template.split(str).join(data[key]); //replace All
                    subject = subject.split(str).join(data[key]); //replace All
                }
            } else {
                template = process_except(data);
            }
            html = `<html><body>
                ${statisBlock.header}${cleanHtml(template)}${statisBlock.footer}
                </body></html>
                `;
            return sendEmail(data.email, subject, {
                html: html, attachments: data.attachments
            },
                emailTemplateId).then(resp => { /*console.log(resp)*/ }).catch(err => { console.log(err); });
        }).catch(err => {
            let table = process_except(data);
            let html1 = `<html><body>${statisBlock.header}${table}${statisBlock.footer}</body></html>`;
            return sendEmail(data.email, subject, { html: html1 }).then(resp => { /*console.log(resp)*/ }).catch(err => { console.log(err); });
        });
    },
    monitorNotificationTrigger: async (trigger_name, data) => {
        var monitor_notifications_log = await db.monitor_notifications_log.create({ trigger_name, data });
        var trigger = await db.email_trigger.findOne({
            where: { name: trigger_name }, include: [
                {
                    model: db.email_trigger_monitor_notification,
                    as: 'monitor_notification',
                    required: true
                }]
        });
        if (trigger == null) {
            await monitor_notifications_log.update({ error: trigger_name + ' is not configured monitor notification' });
            return;
        }
        if (!!!trigger.status) {
            await monitor_notifications_log.update({ error: trigger_name + ' is disabled' });
            return;
        }
        var monitor_notification = trigger.monitor_notification;

        monitor_notification = JSON.parse(JSON.stringify(monitor_notification));

        for (let key in data) {
            let str = "${" + key + "}";
            monitor_notification.title = monitor_notification.title.split(str).join(data[key]); //replace All
            monitor_notification.title_es = monitor_notification.title_es.split(str).join(data[key]); //replace All
        }

        data.type = trigger_name;
        data.warning_level = monitor_notification.warning_level;
        data.title = monitor_notification.title;
        data.title_es = monitor_notification.title_es;

        data.log_id = monitor_notifications_log.id;

        global.io.emit('monitor_notification', data);

        if (data && data.with && data.with.id) {//provider
            var associatedTo = await db.associate.findOne({
                where: {
                    associate: data.with.id
                },
                include: ['user']
            });
            if (associatedTo == null || associatedTo.user == null) return;

            var clinic_trigger = `Staff_${trigger_name}`;

            var titleBody = await module.exports.getMobilePushNotificationTemplate(clinic_trigger, data, associatedTo.user.lang);
            if (titleBody) {
                var title = titleBody.title;
                var body = titleBody.body;
                module.exports.sendWebPushNotification(associatedTo.user.id, title, body);
            }
        }
    },
    sendMobilePushNotification: async (user_id, fcmData = {}, sender_id, platform = 'android', isAdmin = false,) => {
        try {
            var notification_subscription;
            var sender_notification_subscription;
            var token;
            if (!isAdmin) {
                var user = await db.user.findByPk(user_id);
                notification_subscription = await db.notification_subscription.findOne({ where: { user_id: user_id, platform: platform } });
                token = await generateToken({ name: user.name, group: 'client', role: 2 });
                await db.token.create({ userId: user_id, token: token, expired_at: null, login_as: 0, is_for_link: true });
            }
            else {
                notification_subscription = await db.notification_subscription.findOne({ where: { admin_id: user_id, platform: platform } });
            }
            if (sender_id) {
                sender_notification_subscription = await db.notification_subscription.findOne({ where: { user_id: sender_id, platform: platform } });
            }

            if (notification_subscription == null) return;
            var subscription = notification_subscription.subscription;
            if (typeof subscription === 'string') subscription = JSON.parse(subscription);
            if (subscription.fcm_token == null) return;

            var registration_ids = [];

            if (sender_notification_subscription) {
                if (typeof sender_notification_subscription.subscription === 'string')
                    sender_notification_subscription.subscription = JSON.parse(sender_notification_subscription.subscription);
                if (sender_notification_subscription.subscription && sender_notification_subscription.subscription.fcm_token)
                    registration_ids.push(sender_notification_subscription.subscription.fcm_token);
            }
            fcmData.to = subscription.fcm_token;

            fcmData.android = fcmData.android || {};
            fcmData.android.registration_ids = registration_ids;

            fcmData.data = fcmData.data || {};
            fcmData.data.token = token;
            fcm.send(fcmData, function (err, response) {
                if (err) {
                    console.log("Something has gone wrong!", err);
                } else {
                    console.log("Successfully sent with response: ", response);
                    console.log("Successfully sent with response: ", fcmData);
                }
            });
        } catch (e) {
            console.log('e', e);
        }
    },
    sendWebPushNotification: async (user_id, title, body, replay_url, isAdmin = false) => {
        try {
            var notification_subscription;
            var baseDomain = config.baseDomain || 'docty.ai';

            var REPLAY_URL = baseDomain;
            if (!isAdmin) {
                notification_subscription = await db.notification_subscription.findOne({ where: { user_id: user_id, platform: 'web' } });
                if (notification_subscription == null) return;

                var subdomain = '';
                var role = await db.user_role.findOne({ include: ['role_info'], where: { user_id: user_id } });
                if (role && role.role_info && role.role_info.role) subdomain = role.role_info.role.toLowerCase() + '.';
                if (replay_url)
                    if (!replay_url.startsWith('http')) REPLAY_URL = `https://${subdomain}${baseDomain}/${replay_url}`;
                    else REPLAY_URL = replay_url;
            }
            else {
                notification_subscription = await db.notification_subscription.findOne({ where: { admin_id: user_id, platform: 'web' } });
                if (replay_url && !replay_url.startsWith('http')) REPLAY_URL = `https://monitor.${baseDomain}/`;
            }

            if (notification_subscription == null) return;
            var subscription = notification_subscription.subscription;
            if (typeof subscription === 'string') subscription = JSON.parse(subscription);
            var SERVER_URL = 'https://apico.docty.ai/';
            try { SERVER_URL = config.basePath; } catch (e) { }

            const notificationPayload = {
                notification: {
                    body: body,
                    title: title,
                    vibrate: [300, 100, 400, 100, 400, 100, 400],
                    icon: `${SERVER_URL}icons/logo.png`,
                    sound: `${SERVER_URL}audio/ring.mp3`,
                    tag: "docty_push_notification",
                    requireInteraction: true,
                    renotify: true,
                    data: {
                        url: replay_url ? REPLAY_URL : null
                    },
                    actions: [{
                        action: 'reply',
                        title: 'View',
                        icon: `${SERVER_URL}icons/notification_reply.png`,
                    },
                    {
                        action: 'close',
                        title: 'Close',
                        icon: `${SERVER_URL}icons/notification_close.png`,
                    }]
                }
            };
            webpush.sendNotification(subscription, JSON.stringify(notificationPayload))
                .then(resp => { /*console.log(resp); */ })
                .catch(err => console.log(err));
        } catch (e) {
            console.log('e', e);
        }
    },

};
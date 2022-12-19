const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    queueEmail: async (toMail, subject, content, template_id) => {
        let data = {
            from: 'Docty.ai <noreply@docty.ai>',
            to: toMail,
            subject: subject,
            text: content.text,
            html: content.html
        };
        try {
            db.email_conversation.upsert({
                template_id: template_id, to: toMail, subject: subject, message: content.html
            });
        } catch (e) { }
        let job = JSON.stringify(data);
        return db.queue.create({
            job, status: 0, attempt: 0, type: 'email'
        });
    },
    queueSms: async (data) => {
        let job = JSON.stringify(data);
        return db.queue.create({
            job, status: 0, attempt: 0, type: 'sms'
        });
    }
};
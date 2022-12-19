var nodemailer = require('nodemailer');
var AWS = require('aws-sdk');
const config = require(__dirname + '/../config/config.json');
const db = require("../models");

AWS.config.update({ region: 'us-east-2' });

var transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    // auth: {
    //     user: 'noreply@docty.ai',
    //     pass: 'Docty#321'
    // }
    SES: new AWS.SES(config.ses_config)
});

module.exports = {
    sendMail: async (object) => {
        var mailformat = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        if (object.to && mailformat.test(object.to)) {
            return transporter.sendMail(object);
        } else {
            return Promise.reject({ error: 'Invalid Email Address' });
        }
        // .finally(() => {
        //     transporter.close();
        // })
    },
    sendBulkMailJob: async (messages) => {
        // transporter.on("idle", () => {
        // console.log(messages)
        while (transporter.isIdle() && messages.length) {
            let message = messages.shift();
            console.log(message);
            transporter.sendMail(JSON.parse(message.job)).then(res => {
                db.queue.destroy({ where: { id: message.id } });
            })
                .catch(err => {
                    console.log(err);
                    let u = { attempt: (message.attempt + 1), errors: err };
                    if (message.attempt == 4) {
                        u['status'] = 1;
                    }
                    db.queue.update(u, { where: { id: message.id } });
                });
        }
        // });
    }
};

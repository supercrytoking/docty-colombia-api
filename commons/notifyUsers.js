
// const { sendMail } = require('../jobs/mailer');
const { sendSms } = require('../jobs/sms');
const db = require('../models');
const { sendEmail } = require('./helper');

module.exports.notifyUsers = async (message, modes, phones, emails, subject = "Docty.ai", extra = {}) => {
  try {
    if (modes.email) {

      let tepl = null;
      if (typeof modes.email !== 'boolean')
        tepl = await db.email_template.findByPk(modes.email);
      if (!!tepl && !!tepl.html) {
        // if (typeof emails != 'string') emails = emails.join(';')
        await sendEmail(emails, (tepl.subject || subject), { html: tepl.html, ...extra }).then(e => {
          return e;
        })
          .catch(e => {
            console.log(e);
            return e;
          });
      }
      else if (!!message) {
        await sendEmail(emails, subject, { html: message, ...extra }).then(e => {
          return e;
        })
          .catch(e => {
            console.log(e);
            return e;
          });
      }

    }
    if (modes.sms) {
      let sms = [];
      let smtl = null;
      if (typeof modes.sms !== 'boolean')
        smtl = await db.sms_templates.findByPk(modes.sms);
      if (!!smtl && !!smtl.message) {
        phones.forEach(element => {
          sms.push(
            sendSms({
              to: element,
              job: smtl.message
            }, extra)
          );
        });
      } else if (!!message) {
        phones.forEach(element => {
          sms.push(
            sendSms({
              to: element,
              job: message
            }, extra)
          );
        });
      }

      await Promise.all(sms);
    }
    return Promise.resolve(['done']);
  } catch (error) {
    return Promise.reject(error);
  }
};
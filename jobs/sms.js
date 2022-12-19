
const config = require('../config/config.json');
const twilioPhoneNumber = config.twilio.twilioPhoneNumber;
const client = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
const { altiria } = require("../altiria/index");
const db = require("../models");



const twilioMsg = async (object) => {
  const options = {
    to: `+${object.to}`,
    from: twilioPhoneNumber,
    body: object.job
  };
  return client.messages.create(options)
}

const altriaMessage = async (object) => {
  const altreaClient = new altiria();
  const options = {
    to: object.to,
    message: object.job
  };
  return altreaClient.sendMessage(options)
}
module.exports = {
  sendSms: async (object, options = {}) => {
    object.to = object.to.replace(/\+/g, '');
    let inst
    if (!!global.credentials && global.credentials.ACTIVE_SMS_GATEWAY == "Twilio") {
      inst = twilioMsg(object)
    } else {
      inst = altriaMessage(object)
    }
    return await inst
      .then(async (message) => {
        try {
          await db.sms_conversation.create({
            template_id: options.template_id || null,
            to: object.to, message: object.job,
            reference: options.reference || null,
            identifier: options.identifier || null
          }).catch(console.log);
        } catch (e) { console.log(e) }
        return message;
      })
      .catch((error) => {
        throw error;
      });
  }
};
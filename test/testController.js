const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const crypto = require("crypto");
const { sendMobilePushNotification, sendWebPushNotification } = require('../commons/crmTrigger');

module.exports = {
  async test(req, res, next) {
    const ENC_KEY = "bf3c199c2470cb477d907b1e0917c17b";
    const IV = "5183666c72eec9e4";
    // Encrypt
    let cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, IV);
    let encrypted = cipher.update(JSON.stringify({
      "id": "4634",
      "schedule_id": "74373",
      "provider_id": "188",
      "councelling_type": "video_call",
      "speciality_id": "43"
    }), 'utf8', 'base64');
    // encrypted += cipher.final('base64');
    // decrypt
    let decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, IV);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    res.send({ encrypted, decrypted })
  },
  webpush: async (req, res) => {
    let data = req.body || {};
    await sendWebPushNotification(data.user_id, data.title, data.body, data.url)
    res.send(data);
  }

}
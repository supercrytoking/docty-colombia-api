const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const static = require('../../config/static.json');
const { notifyUsers } = require('../../commons/notifyUsers');
const { crmTrigger, getMobilePushNotificationTemplate, sendMobilePushNotification, sendWebPushNotification } = require('../../commons/crmTrigger');

module.exports = {
  engage: async (req, res, next) => {
    let data = req.body || {};
    if (!data.user_id) {
      return res.status(400).send({ status: false, error: 'User id not present' });
    }
    let user = await db.user.findByPk(data.user_id);
    console.log(user);

    if (!!!user) {
      return res.status(400).send({ status: false, error: 'Invalid User Id' });
    }
    notifyUsers(data.message, {
      email: data.email, sms: data.sms
    }, [`${user.isd_code}${user.phone_number}`], user.email, data.subject,
      { reference: data.reference, identifier: 'wellness' }).then(r => {
        res.send({ stattus: true })
      }).catch(e => res.status(400).send({ status: false, error: `${e}` }))
  },
  getEmails: async (req, res) => {
    let data = req.body || {};
    db.email_conversation.findAll({
      where: { identifier: 'wellness', to: data.email }
    }).then(r => res.send(r))
  },
  getSms: async (req, res) => {
    let data = req.body || {};
    db.sms_conversation.findAll({
      where: { identifier: 'wellness', to: data.phone_number }
    }).then(r => res.send(r))
  },
  forceToSync: async (req, res, next) => {
    let user_id = req.params.id;
    let user = await db.user.findByPk(user_id);
    if (!!!user) {
      return res.send({ status: true });
    }

    var titleBody = await getMobilePushNotificationTemplate('WATCH_SYNC_TEMPLATE', { reveiver_name: user.fullName }, (user || {}).lang || 'en');
    if (titleBody) {
      titleBody = {};
    }

    let fcmData = {
      // to: subscription.fcm_token,
      collapse_key: 'call',
      android: {
        ttl: '40s',
        priority: 'high',
      },
      data: {
        title: titleBody.title || "Sync Your Watch",
        body: titleBody.body || 'Your health advisor requested to sync your health device',
        collapsekey: 'WATCH_SYNC_TEMPLATE',
        callCount: "10",
        android_channel_id: "WATCH_SYNC_TEMPLATE",
        collapsekey: 'WATCH_SYNC_TEMPLATE',
        // providerId: sender_user.id,
        sound: "ring.mp3",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      "notification": {
        title: titleBody.title || "Sync Your Watch",
        body: titleBody.body || 'Your health advisor requested to sync your health device',
        // "content_available": true,
        sound: "ring.mp3",
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: titleBody.title || "Sync Your Watch",
              body: titleBody.body || 'Your health advisor requested to sync your health device',
            },
            sound: 'ring.mp3'
          }
        },
        headers: {
          "apns-expiration": (Date.now() / 1000 + 40)
        }
      }
    };
    console.log(JSON.stringify(fcmData));
    await sendMobilePushNotification(user_id, fcmData, req.user.id, 'android', req.user.group == 'admin');
    await sendMobilePushNotification(user_id, fcmData, req.user.id.id, 'ios', req.user.group == 'admin');
    return res.send({ status: true });
  }
}
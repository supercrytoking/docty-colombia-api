const RtcTokenBuilder = require('./src/RtcTokenBuilder').RtcTokenBuilder;
const RtcRole = require('./src/RtcTokenBuilder').Role;
const Sequelize = require('sequelize');

const db = require("../models");
const Op = Sequelize.Op;

const RtmTokenBuilder = require('./src/RtmTokenBuilder').RtmTokenBuilder;
const RtmRole = require('./src/RtmTokenBuilder').Role;
const Priviledges = require('./src/AccessToken').priviledges;

const appID = '47832ca9350b4102a3f75ba20b7172d6';
const appCertificate = '4a7f5fee78fb4e56b13c6a6d4fef1e9e';
const role = RtcRole.PUBLISHER;



// IMportalT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.

// Build token with uid
// const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
// console.log("Token With Integer Number Uid: " + tokenA);

// Build token with user account
// const tokenB = RtcTokenBuilder.buildTokenWithAccount(appID, appCertificate, channelName, account, role, privilegeExpiredTs);
// console.log("Token With UserAccount: " + tokenB);



// https://docs.agora.io/en/Video/video_profile_web?platform=Web
var AGORA_PROFILE_TABLE = [{
  "profile": "120p_1",
  "size": "160 × 120",
  "fps": 15,
  "bitrate_kbps": 65
},
{
  "profile": "120p_3",
  "size": "120 × 120",
  "fps": 15,
  "bitrate_kbps": 50
},
{
  "profile": "180p_1",
  "size": "320 × 180",
  "fps": 15,
  "bitrate_kbps": 140
},
{
  "profile": "180p_3",
  "size": "180 × 180",
  "fps": 15,
  "bitrate_kbps": 100
},
{
  "profile": "180p_4",
  "size": "240 × 180",
  "fps": 15,
  "bitrate_kbps": 120
},
{
  "profile": "240p_1",
  "size": "320 × 240",
  "fps": 15,
  "bitrate_kbps": 200
},
{
  "profile": "240p_3",
  "size": "240 × 240",
  "fps": 15,
  "bitrate_kbps": 140
},
{
  "profile": "240p_4",
  "size": "424 × 240",
  "fps": 15,
  "bitrate_kbps": 220
},
{
  "profile": "360p_1",
  "size": "640 × 360",
  "fps": 15,
  "bitrate_kbps": 400
},
{
  "profile": "360p_3",
  "size": "360 × 360",
  "fps": 15,
  "bitrate_kbps": 260
},
{
  "profile": "360p_4",
  "size": "640 × 360",
  "fps": 30,
  "bitrate_kbps": 600
},
{
  "profile": "360p_6",
  "size": "360 × 360",
  "fps": 30,
  "bitrate_kbps": 400
},
{
  "profile": "360p_7",
  "size": "480 × 360",
  "fps": 15,
  "bitrate_kbps": 320
},
{
  "profile": "360p_8",
  "size": "480 × 360",
  "fps": 30,
  "bitrate_kbps": 490
},
{
  "profile": "360p_9",
  "size": "640 × 360",
  "fps": 15,
  "bitrate_kbps": 800
},
{
  "profile": "360p_10",
  "size": "640 × 360",
  "fps": 24,
  "bitrate_kbps": 800
},
{
  "profile": "360p_11",
  "size": "640 × 360",
  "fps": 24,
  "bitrate_kbps": 1000
},
{
  "profile": "480p_1",
  "size": "640 × 480",
  "fps": 15,
  "bitrate_kbps": 500
},
{
  "profile": "480p_2",
  "size": "640 × 480",
  "fps": 30,
  "bitrate_kbps": 1000
},
{
  "profile": "480p_3",
  "size": "480 × 480",
  "fps": 15,
  "bitrate_kbps": 400
},
{
  "profile": "480p_4",
  "size": "640 × 480",
  "fps": 30,
  "bitrate_kbps": 750
},
{
  "profile": "480p_6",
  "size": "480 × 480",
  "fps": 30,
  "bitrate_kbps": 600
},
{
  "profile": "480p_8",
  "size": "848 × 480",
  "fps": 15,
  "bitrate_kbps": 610
},
{
  "profile": "480p_9",
  "size": "848 × 480",
  "fps": 30,
  "bitrate_kbps": 930
},
{
  "profile": "480p_10",
  "size": "640 × 480",
  "fps": 10,
  "bitrate_kbps": 400
},
{
  "profile": "720p_1",
  "size": "1280 × 720",
  "fps": 15,
  "bitrate_kbps": 1130
},
{
  "profile": "720p_2",
  "size": "1280 × 720",
  "fps": 30,
  "bitrate_kbps": 2000
},
{
  "profile": "720p_3",
  "size": "1280 × 720",
  "fps": 30,
  "bitrate_kbps": 1710
},
{
  "profile": "720p_5",
  "size": "960 × 720",
  "fps": 15,
  "bitrate_kbps": 910
},
{
  "profile": "720p_6",
  "size": "960 × 720",
  "fps": 30,
  "bitrate_kbps": 1380
},

  // Below profile is no used, the price is 15$/1000minutes

  // {
  //   "profile": "1080p_1",
  //   "size": "1920 × 1080",
  //   "fps": 15,
  //   "bitrate_kbps": 2080
  // },
  // {
  //   "profile": "1080p_2",
  //   "size": "1920 × 1080",
  //   "fps": 30,
  //   "bitrate_kbps": 3000
  // },
  // {
  //   "profile": "1080p_3",
  //   "size": "1920 × 1080",
  //   "fps": 30,
  //   "bitrate_kbps": 3150
  // },
  // {
  //   "profile": "1080p_5",
  //   "size": "1920 × 1080",
  //   "fps": 60,
  //   "bitrate_kbps": 4780
  // },
  // {
  //   "profile": "1440p",
  //   "size": "2560 × 1440",
  //   "fps": 30,
  //   "bitrate_kbps": 4850
  // },
  // {
  //   "profile": "1440p_1",
  //   "size": "2560 × 1440",
  //   "fps": 30,
  //   "bitrate_kbps": 4850
  // },
  // {
  //   "profile": "1440p_2",
  //   "size": "2560 × 1440",
  //   "fps": 60,
  //   "bitrate_kbps": 7350
  // },
  // {
  //   "profile": "4K_1",
  //   "size": "3840 × 2160",
  //   "fps": 30,
  //   "bitrate_kbps": 8910
  // },
  // {
  //   "profile": "4K_3",
  //   "size": "3840 × 2160",
  //   "fps": 60,
  //   "bitrate_kbps": 13500
  // }
];

module.exports = {
  async getToken(req, res, next) {
    let expirationTimeInSeconds = 3600
    let currentTimestamp = Math.floor(Date.now() / 1000)
    let privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
    if (req.body) {
      try {
        let channel = null;
        let patient_id = null;
        let provider_id = null;
        let chh = {};
        if (req.body.channel) {
          channel = req.body.channel;
          chh = await db.booking.findOne({ where: { reference_id: channel, status: { [Op.in]: [1, 5, 10] } }, include: ['schedule'] });
          patient_id = chh.patient_id;
          provider_id = chh.provider_id;

          // if (chh.schedule && !!chh.schedule.end) {
          //   let t = 3//00000;
          //   if (!!global.credentials && !!global.credentials.VIDEO_CALL_ALLOWED_TILL_MINUTS) {
          //     t = parseInt(global.credentials.VIDEO_CALL_ALLOWED_TILL_MINUTS) * 1000
          //   }
          //   let timeE = (Date.now() + t);
          //   let sE = new Date(chh.schedule.end).getTime()
          //   if (sE > timeE) {
          //     throw new Error('ALERT.SCHEDULE_EXPIRED')
          //   }
          // } else {
          //   throw new Error('ALERT.SCHEDULE_EXPIRED')
          // }

        } else {
          throw new Error('SERVER_MESSAGE.INVALID_CHANNEL')
        }

        if (channel) {
          const token = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channel, req.body.uid, role, privilegeExpiredTs);
          // if (chh.status == 5 || chh.status == 'accepted')
          //   chh.update({ status: 'running' });
          var video_profile = '240p_1';
          if (req.body.speedKbps) {

            for (var i = 0; i < AGORA_PROFILE_TABLE.length; i++) {
              if (AGORA_PROFILE_TABLE[i].bitrate_kbps < req.body.speedKbps) video_profile = AGORA_PROFILE_TABLE[i].profile;
            }
            video_profile = video_profile;
          }

          res.send({
            success: true,
            token: token,
            channel, patient_id, provider_id,
            video_profile: video_profile
          });
        } else {
          res.status(400).send({
            success: false,
            errors: "SERVER_MESSAGE.UN_DEFINED_CHANNEL"
          })
        }
      } catch (error) {
        res.status(400).send({
          success: false,
          errors: `${error}`
        })
      }
    } else {
      res.status(400).send({
        success: false,
        errors: "SERVER_MESSAGE.UN_DEFINED_CHANNEL"
      })
    }

  },
  async getVideoProfile(req, res, next) {
    var video_profile = '240p_1';
    if (req.body.speedKbps) {

      for (var i = 0; i < AGORA_PROFILE_TABLE.length; i++) {
        if (AGORA_PROFILE_TABLE[i].bitrate_kbps < req.body.speedKbps) video_profile = AGORA_PROFILE_TABLE[i].profile;
      }
      video_profile = video_profile;
    }

    res.send({
      success: true,
      video_profile: video_profile
    });
  },
  token(req, res, next) {
    let expirationTimeInSeconds = 3600
    let currentTimestamp = Math.floor(Date.now() / 1000)
    let privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
    const token = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, req.body.channel, req.body.uid, role, privilegeExpiredTs);
    res.send({ token });
  }
}

async function getCouncelingId(req) {
  if (req.caller_id && req.receiver_id) {
    let channel = req.channel;
    return db.councelling.findOrCreate({
      where: { patient_id: req.caller_id, provider_id: req.receiver_id },
      defaults: { channel }
    }).then(res => res)
  } else {
    return Promise.reject(JSON.stringify(req))
  }
}
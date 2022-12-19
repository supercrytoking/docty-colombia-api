const { sendMail, sendBulkMailJob } = require('./mailer');
const { sendSms } = require('./sms');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { otpTrigger, crmTrigger, getMobilePushNotificationTemplate, sendMobilePushNotification, sendWebPushNotification } = require('../commons/crmTrigger');
const { smsTrigger } = require('../commons/smsCrmTrigger');
const { getNewPassword, councelling_link, councelling_type, scheduleTimeFormat, dateFormat, getAge, generateToken } = require('../commons/helper');
require('../socket');
const config = require(__dirname + '/../config/config.json');
const btoa = require('btoa');
const e = require('express');

var POST_API = (url, data) => {
  return new Promise((resolve, reject) => {
    const request = require('request');
    var options = {
      'method': 'POST',
      'url': url,
      'headers': { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)

    };
    request(options, function (error, response) {
      if (error) return reject(error);
      try {
        var data = response.body;
        data = JSON.parse(data);
        resolve(data);
      } catch (error) {
        resolve([]);
      }
    });

  });
};

var checkOnline = (userIdList) => {
  return new Promise((resolve, reject) => {
    const config = require('../config/config.json');
    var url = `${config.socket_server_url}/api/socket_io/checkUserOnline`;
    POST_API(url, userIdList)
      .then(data => {
        if (data.success) resolve(data.data);
        else reject('Failed');
      });
  });
};

var createNotification = (data) => {
  return new Promise((resolve, reject) => {
    const config = require('../config/config.json');
    var url = `${config.socket_server_url}/api/socket_io/createNotification`;
    POST_API(url, data)
      .then(data => {
        if (data.success) resolve(data.data);
        else reject('Failed');
      });

  });
};

var getBookingList = async (scheduleRange) => {
  try {
    var bookingList = await db.booking.findAll({
      where: {
        status: 5
      },
      include: [
        // 'family_member',
        {
          model: db.userFamilyView,
          as: 'patientInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'lang', 'timezone_offset'],
          required: true
        },
        {
          model: db.user,
          as: 'providerInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'lang', 'timezone_offset'],
          required: true
        },
        {
          model: db.schedule,
          as: 'schedule',
          attributes: ['start', 'end', 'id'],
          where: scheduleRange,
          // required: true
        }],
      // order: [['createdAt', 'DESC']]
    });
    bookingList = JSON.parse(JSON.stringify(bookingList));
    return bookingList;
  } catch (e) {
    console.log(e);
  }
  return [];
};

var getUserListWithInsurance = async (insuraceRange) => {
  try {
    var userList = await db.user.findAll({
      include: [{
        model: db.user_role,
        as: 'user_role',
        where: {
          role_id: { [Op.in]: [2] } // patient
        }
      },
      {
        model: db.user_insurance,
        as: 'insurance',
        where: insuraceRange,
        // include: ['insurence_provider']
      },
      ],
      attributes: ['id', 'fullName', 'first_name', 'last_name', 'middle_name', 'email', 'picture', 'dob', 'lang']
    });
    userList = JSON.parse(JSON.stringify(userList));
    return userList;
  } catch (e) {
    console.log(e);
  }
  return [];
};

module.exports = {
  emailer: async () => {
    db.queue.findAll(
      {
        where: {
          type: 'email',
          attempt: { [Op.lt]: 5 },
          status: 0
        },
        limit: 20
      }
    ).then(async res => {
      if (!!res) {
        try {
          res.forEach(r => r.update({ status: 1 }));
          for (var i = 0; i < res.length; i++) {
            let elem = res[i];
            try {
              await sendMail(JSON.parse(elem.job)).then((r) => {
                elem.destroy();
              }).catch((err) => {
                // console.log(err);
                let u = { attempt: (elem.attempt + 1), errors: err, status: 0 };
                elem.update(u);
              });
            } catch (error) {
              elem.update({
                attempt: (elem.attempt + 1),
                errors: error,
                status: 0
              });
            }
          }
        } catch (error) {
          console.log(error);
        }
      }
    }).catch(e => {
      console.log('error mailer', e)
    });
  },
  sms: async () => {
    db.queue.findAll({
      where: {
        type: 'sms'
      }
    }).then(async res => {
      if (!!res) {
        try {
          for (var i = 0; i < res.length; i++) {
            let elem = res[i];
            try {
              // var appointments = requiresNotification(JSON.parse(elem.job));
              var appointments = JSON.parse(elem.job);
              if (appointments && appointments.message) {
                sendSms({
                  to: appointments.to,
                  job: appointments.message
                }).then((data) => {
                  elem.destroy();
                }).catch((err) => {
                  elem.update({
                    attempt: (elem.attempt + 1)
                  });
                });
              }
            } catch (error) {
              console.log(error);
              // elem.update({
              //     attempt: (elem.attempt + 1)
              // });
              elem.update({ attempt: (elem.attempt + 1) });
            }
          }
        } catch (error) {
          console.log(error);
        }
      }
    });
  },

  pendingStaffSignupReminder: async () => {
    db.user.findAll({
      where: {
        // [Op.or]: [
        //     { isSigned: false },
        //     { isSigned: null },
        // ]
        status: { [Op.ne]: 1 }
      },
      include: [{
        model: db.user_role,
        as: 'user_role',
        where: {
          role_id: { [Op.ne]: 2 } // not patient
        }
      }],
      attributes: ['id', 'fullName', 'first_name', 'last_name', 'middle_name', 'email', 'isSigned']
    }).then(users => {
      users = JSON.parse(JSON.stringify(users));
      users.forEach(async user => {
        otpTrigger('Pending_Staff_Signup', { email: user.email, subject: 'Docty Health Care: Pending Signup', userName: user.fullName }, user.lang || 'en');
        // var pwdObj = await getNewPassword();
        // db.user.update({ password: pwdObj.hashPassword }, { where: { id: user.id } })
        //     .then(r => {
        //         otpTrigger('Pending_Staff_Signup', { email: user.email, subject: 'Docty Health Care: Pending Signup', userName: user.fullName, password: pwdObj.password }, user.lang || 'en');
        //     })

      });
    });
  },
  happyBirthday: async () => {
    var now = new Date();

    var month = now.getMonth() + 1;
    var today = now.getDate();

    db.user.findAll({
      where: {
        [Op.and]: [
          Sequelize.where(Sequelize.fn('month', Sequelize.col("dob")), month),
          Sequelize.where(Sequelize.fn('day', Sequelize.col("dob")), today),
        ]
      },
      include: [{
        model: db.user_role,
        as: 'user_role',
        where: {
          role_id: { [Op.in]: [1, 2, 3] } // doctor, patient, nurse
        }
      }],
      attributes: ['id', 'fullName', 'first_name', 'last_name', 'middle_name', 'email', 'isSigned', 'picture', 'dob']
    }).then(users => {
      users = JSON.parse(JSON.stringify(users));
      users.forEach(async user => {
        otpTrigger('Happy_birthday', { email: user.email, user_name: user.fullName, user_photo: user.picture, dob: dateFormat(user.dob) }, user.lang || 'en');
      });
    });
  },

  incorporationGreeting: async () => {
    var now = new Date();

    var month = now.getMonth() + 1;
    var today = now.getDate();

    db.user.findAll({
      where: {
        [Op.and]: [
          Sequelize.where(Sequelize.fn('month', Sequelize.col("dob")), month),
          Sequelize.where(Sequelize.fn('day', Sequelize.col("dob")), today),
        ]
      },
      include: [{
        model: db.user_role,
        as: 'user_role',
        where: {
          role_id: { [Op.in]: [5, 6] } // clinic, phanamcy
        }
      }],
      attributes: ['id', 'company_name', 'email', 'picture', 'dob']
    }).then(users => {
      users = JSON.parse(JSON.stringify(users));
      users.forEach(async user => {
        otpTrigger('incorporation_greeting', { email: user.email, organization_name: user.company_name, organization_photo: user.picture, incorporation_date: dateFormat(user.dob), age: getAge(user.dob) }, 'en');
      });
    });
  },

  insuranceReminder: async () => {
    var now = new Date();
    now.setHours(0);
    now.setMinutes(0);
    now.setSeconds(0);
    var date_list = [30, 10, 5, 4, 3, 2, 1];
    date_list.forEach(async date_before => {
      var start = new Date(now);
      start.setDate(start.getDate() - date_before);
      var end = new Date(now);
      end.setDate(end.getDate() - date_before + 1);
      var insuraceRange = {
        end_date: { [Op.gte]: start, [Op.lte]: end },
      };

      var userListDayInsurance = await getUserListWithInsurance(insuraceRange);
      userListDayInsurance.forEach(user => {
        if (user.insurance == null || user.insurance.insurance_provider == null) return;
        var trigger = `Insurance_expires_soon_${date_before}day`;
        if (date_before == 2) trigger = 'Insurance_expires_2day';
        if (date_before == 1) trigger = 'Insurance_expires_today';
        if (date_before == 3) trigger = 'Insurance_expires_in_3day';
        otpTrigger(trigger, {
          email: user.email,
          user_name: user.fullName,
          insurance_company: user.insurance.insurance_provider.name,
          insurance_number: user.insurance.card_number,
          insurance_copy_file: user.insurance.card_copy,
          expiry_date: dateFormat(user.insurance.end_date)
        }, user.lang || 'en');
      });
    });
  },

  calendarEmptyReminder: async () => {
    var now = new Date();
    now.setHours(0);
    now.setMinutes(0);
    now.setSeconds(0);

    var start = new Date(now);
    start.setDate(start.getDate());
    var end = new Date(now);
    end.setDate(end.getDate() + 1);

    var userList = await db.user.scope('').findAll({
      include: [{
        model: db.user_role,
        as: 'user_role',
        where: {
          role_id: { [Op.in]: [1] } // doctor
        }
      },
      {
        model: db.schedule,
        as: 'schedule',
        required: false,
        where: {
          start: { [Op.gte]: start, [Op.lte]: end },
          calendarId: { [Op.in]: [4] },
          state: { [Op.ne]: 'Busy' }
        },
      },
      ],
      attributes: ['id', 'fullName', 'first_name', 'last_name', 'middle_name', 'email', 'picture', 'lang']
    });
    userList = JSON.parse(JSON.stringify(userList));
    //console.log(userList)
    userList.forEach(user => {
      if (user.schedule == null || user.schedule.length == 0) {
        crmTrigger(`Empty_Calender`, {
          email: user.email,
          provider_name: user.fullName,
          provider_photo: user.picture
        }, user.lang || 'es');
      }

    });

  },

  bookingReminder: async () => {

    var now = new Date();

    var start = new Date(now);
    start.setMinutes(start.getMinutes() + 10);
    var end = new Date(now);
    end.setMinutes(end.getMinutes() + 10);
    end.setSeconds(end.getSeconds() + 50);

    var bookingList10Minutes = await getBookingList({
      start: { [Op.gte]: start, [Op.lte]: end },
    });
    bookingList10Minutes.forEach(async booking => {
      var patient = booking.patientInfo;
      var provider = booking.providerInfo;
      if (patient == null || provider == null) return;
      var time = '';
      if (booking && booking.schedule) time = scheduleTimeFormat(booking.schedule, patient.timezone_offset);
      var patientHash = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
      await db.token.create({ userId: patient.id, token: patientHash, expired_at: null, login_as: 0, is_for_link: true });
      var returnUrl = `/my-consultation/${btoa(booking.id).replace(/=/g, '')}`;
      /////////// Getting user details from DB for phone number//////////////
      var user_patient = await db.user.findOne({ where: { id: patient.id } });
      var user_doctor = await db.user.findOne({ where: { id: provider.id } });
      /////////// Sending 10min remainder sms to patient phone number//////////////
      smsTrigger('Reminder_To_Patient_10_Minute', {
        doctor_name: provider.fullName,
        request_number: booking.reference_id,
        patient_name: patient.fullName,
        link: `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        to: user_patient.isd_code + user_patient.phone_number,
        time: time
      }, patient.lang || 'en', 0);
      let cl = await db.associate.findOne({ where: { associate: booking.provider_id } });
      let clinic_id = null;
      if (!!cl && !!cl.user_id) {
        clinic_id = cl.user_id || null
      }
      otpTrigger('Patient_Reminder_1', {
        email: patient.email, clinic_id: clinic_id,
        consultation_id: booking.reference_id,
        patient_name: patient.fullName,
        provider_name: provider.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type),
        date_time: time,
        link: `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        consultation_room_link: `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`
      }, patient.lang || 'en');
      if (booking && booking.schedule) time = scheduleTimeFormat(booking.schedule, provider.timezone_offset);
      var providerHash = await generateToken({ name: provider.first_name, group: 'client', role: 1 });
      await db.token.create({ userId: provider.id, token: providerHash, expired_at: null, login_as: 0, is_for_link: true });
      returnUrl = `/my-consultation/${btoa(booking.id).replace(/=/g, '')}`;
      /////////// Sending 10min remainder sms to doctor phone number//////////////
      smsTrigger('Reminder_To_Doctor_10_Minute', {
        doctor_name: provider.fullName,
        request_number: booking.reference_id,
        patient_name: patient.fullName,
        link: `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        to: user_doctor.isd_code + user_doctor.phone_number,
        time: time
      }, provider.lang || 'en', 0);
      otpTrigger('Consultation_Reminder_1', {
        email: provider.email,
        consultation_id: booking.reference_id,
        provider_name: provider.fullName,
        patient_name: patient.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type),
        date_time: time,
        consultation_room_link: `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        link: `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`
      }, provider.lang || 'en');


      var titleBody = await getMobilePushNotificationTemplate('Patient_Reminder_1', {
        email: patient.email,
        consultation_id: booking.reference_id,
        patient_name: patient.fullName,
        provider_name: provider.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type),
        date_time: time
      }, patient.lang);
      if (titleBody) {
        var title = titleBody.title;
        var body = titleBody.body;


        var fcmData = {
          // to: subscription.fcm_token,
          android: {
            ttl: '40s',
            priority: 'high',
            // registration_ids: registration_ids
          },
          data: {
            collapsekey: 'Patient_Reminder_1',
            android_channel_id: "Message Notification",
            title: title,
            body: body,
            sound: "message.mp3",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            // token: token
          }
        };
        sendMobilePushNotification(patient.id, fcmData, provider.id, 'android');
        var fcmData = {
          // to: subscription.fcm_token,
          data: {
            collapsekey: 'Patient_Reminder_1',
            android_channel_id: "Message Notification",
            title: title,
            body: body,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            // token: token
          },
          "notification": {
            "title": title,
            "body": body,
            // "content_available": true,
            sound: "message.mp3",
          },
        };
        sendMobilePushNotification(patient.id, fcmData, provider.id, 'ios');
        sendWebPushNotification(patient.id, title, body, `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`);
      }
      var titleBody = await getMobilePushNotificationTemplate('Consultation_Reminder_1', {
        email: provider.email,
        consultation_id: booking.reference_id,
        provider_name: provider.fullName,
        patient_name: patient.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type),
        date_time: time,
      }, provider.lang);
      if (titleBody) {
        var title = titleBody.title;
        var body = titleBody.body;
        sendWebPushNotification(provider.id, title, body, `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`);
      }
    });


    start = new Date(now);
    start.setMinutes(start.getMinutes() + 5);
    end = new Date(now);
    end.setMinutes(end.getMinutes() + 5);
    end.setSeconds(end.getSeconds() + 50);

    var bookingList5Minutes = await getBookingList({
      start: { [Op.gte]: start, [Op.lte]: end },
    });
    bookingList5Minutes.forEach(async booking => {
      var patient = booking.patientInfo;
      var provider = booking.providerInfo;
      if (patient == null || provider == null) return;

      var time = '';
      if (booking && booking.schedule) time = scheduleTimeFormat(booking.schedule, patient.timezone_offset);
      var patientHash = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
      await db.token.create({ userId: patient.id, token: patientHash, expired_at: null, login_as: 0, is_for_link: true });
      var returnUrl = `/my-consultation/${btoa(booking.id).replace(/=/g, '')}`;
      /////////// Getting user details from DB for phone number//////////////
      var user_patient = await db.user.findOne({ where: { id: patient.id } });
      var user_doctor = await db.user.findOne({ where: { id: provider.id } });

      /////////// Sending 5min remainder sms to patient phone number//////////////
      smsTrigger('Reminder_To_Patient_1_Minute', {
        doctor_name: provider.fullName,
        request_number: booking.reference_id,
        patient_name: patient.fullName,
        link: `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        to: user_patient.isd_code + user_patient.phone_number,
        time: time
      }, patient.lang || 'en', 0);
      let cl = await db.associate.findOne({ where: { associate: booking.provider_id } });
      let clinic_id = null;
      if (!!cl && !!cl.user_id) {
        clinic_id = cl.user_id || null
      }
      otpTrigger('Patient_Reminder_2', {
        email: patient.email, clinic_id: clinic_id,
        consultation_id: booking.reference_id,
        patient_name: patient.fullName,
        provider_name: provider.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type),
        date_time: time,
        consultation_room_link: `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        link: `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`
      }, patient.lang || 'en');
      if (booking && booking.schedule) time = scheduleTimeFormat(booking.schedule, provider.timezone_offset);
      var providerHash = await generateToken({ name: provider.first_name, group: 'client', role: 1 });
      await db.token.create({ userId: provider.id, token: providerHash, expired_at: null, login_as: 0, is_for_link: true });
      returnUrl = `/my-consultation/${btoa(booking.id).replace(/=/g, '')}`;
      /////////// Sending 5min remainder sms to doctor phone number//////////////
      smsTrigger('Reminder_To_Doctor_1_Minute', {
        doctor_name: provider.fullName,
        request_number: booking.reference_id,
        patient_name: patient.fullName,
        link: `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        to: user_doctor.isd_code + user_doctor.phone_number,
        time: time
      }, provider.lang || 'en', 0);
      otpTrigger('Consultation_Reminder_2', {
        email: provider.email,
        consultation_id: booking.reference_id,
        patient_name: patient.fullName,
        provider_name: provider.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type, 'patient'),
        date_time: time,
        consultation_room_link: `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`,
        link: `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`
      }, provider.lang || 'en');

      var titleBody = await getMobilePushNotificationTemplate('Patient_Reminder_2', {
        email: patient.email,
        consultation_id: booking.reference_id,
        patient_name: patient.fullName,
        provider_name: provider.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type),
        date_time: time
      }, patient.lang);
      if (titleBody) {
        var title = titleBody.title;
        var body = titleBody.body;

        var fcmData = {
          // to: subscription.fcm_token,
          android: {
            ttl: '40s',
            priority: 'high',
            // registration_ids: registration_ids
          },
          data: {
            collapsekey: 'Patient_Reminder_2',
            android_channel_id: "Message Notification",
            title: title,
            body: body,
            sound: "message.mp3",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            // token: token
          }
        };
        sendMobilePushNotification(patient.id, fcmData, provider.id, 'android');
        var fcmData = {
          // to: subscription.fcm_token,
          data: {
            collapsekey: 'Patient_Reminder_2',
            android_channel_id: "Message Notification",
            title: title,
            body: body,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            // token: token
          },
          "notification": {
            "title": title,
            "body": body,
            // "content_available": true,
            sound: "message.mp3",
          },
        };
        sendMobilePushNotification(patient.id, fcmData, provider.id, 'ios');
        sendWebPushNotification(patient.id, title, body, `${config.domains.patient}/setup?token=${patientHash}&returnUrl=${encodeURIComponent(returnUrl)}`);
      }

      var titleBody = await getMobilePushNotificationTemplate('Consultation_Reminder_2', {
        email: provider.email,
        consultation_id: booking.reference_id,
        provider_name: provider.fullName,
        patient_name: patient.fullName,
        provider_picture: provider.picture,
        patient_picture: patient.picture,
        type: councelling_type(booking.councelling_type),
        date_time: time,
      }, provider.lang);
      if (titleBody) {
        var title = titleBody.title;
        var body = titleBody.body;
        sendWebPushNotification(provider.id, title, body, `${config.domains.doctor}/setup?token=${providerHash}&returnUrl=${encodeURIComponent(returnUrl)}`);
      }
    });

    start = new Date(now);
    start.setMinutes(start.getMinutes() + 1);
    end = new Date(now);
    end.setMinutes(end.getMinutes() + 1);
    end.setSeconds(end.getSeconds() + 50);

    var bookingList1Minutes = await getBookingList({
      start: { [Op.gte]: start, [Op.lte]: end },
    });
    var userIdList = [];
    bookingList1Minutes.forEach(async booking => {
      var patient = booking.patientInfo;
      var provider = booking.providerInfo;
      if (patient == null || provider == null) return;
      userIdList.push(patient.id);
      userIdList.push(provider.id);
    });
    checkOnline(userIdList).then(r => {
      r.forEach(info => {
        if (!info.online) {
          var book = bookingList1Minutes.find(b => b.patient_id == info.user_id || b.provider_id == info.user_id);

          if (book) {
            var user = book.patient_id == info.user_id ? book.patientInfo : book.providerInfo;
            createNotification({ event: 'monitor_notification', data: { type: 'CALL_IN_1MINUTES_OFFLINE', booking_id: book.id, user: user, user_name: user.fullName, with: book.providerInfo, by: book.patientInfo, patient_name: book.patientInfo.fullName, provider_name: book.providerInfo.fullName } });
          }
        }
      });
    });

    start = new Date(now);
    start.setMinutes(start.getMinutes() + 1);
    end = new Date(now);
    end.setMinutes(end.getMinutes() + 1);
    end.setSeconds(end.getSeconds() + 50);

    // missed booking
    var bookingListMissed = await getBookingList({
      end: { [Op.gte]: start, [Op.lte]: end },
    });
    bookingListMissed.forEach(async booking => {
      var patient = booking.patientInfo;
      var provider = booking.providerInfo;
      if (patient == null || provider == null) return;
      createNotification({ event: 'monitor_notification', data: { type: 'CALL_MISSED', booking_id: booking.id, with: booking.providerInfo, by: booking.patientInfo, patient_name: booking.patientInfo.fullName, provider_name: booking.providerInfo.fullName } });
    });
  },
  unreadMesageReminder: async () => {
    var messageList = await db.message_log.findAll({
      where: {
        seen: false,
        is_notified: false
      },
      include: [{
        model: db.message_reference,
        as: 'reference_info',
        include: [
          {
            model: db.booking,
            as: 'booking',
            include: ['providerInfo', 'patientInfo'],
          },
        ],
        required: false
      },
        'receiver_info'
      ]
    });
    db.message_log.update({ is_notified: true }, { where: { is_notified: false, seen: false } });
    messageList.forEach(async message_log => {
      if (message_log.receiver_info) {
        var titleBody = await getMobilePushNotificationTemplate('Message', { reveiver_name: message_log.receiver_info.fullName, message: message_log.message }, (message_log.receiver_info || {}).lang);
        if (titleBody) {
          var title = titleBody.title;
          var body = titleBody.body;

          var additionalInfo = {
            provider_name: null,
            provider_id: null,
            patient_id: null,
            booking_id: null,
          };
          if (message_log.reference_info) {
            try {
              var message_reference = message_log.reference_info;
              if (message_reference && message_reference.booking) {
                additionalInfo.booking_id = message_reference.booking.id;
                additionalInfo.provider_name = message_reference.booking.providerInfo.fullName;
                additionalInfo.provider_id = message_reference.booking.providerInfo.id;
                additionalInfo.patient_id = message_reference.booking.patientInfo.id;
              }
            } catch (e) { }
          }

          var fcmData = {
            // to: subscription.fcm_token,
            android: {
              ttl: '40s',
              priority: 'high',
              // registration_ids: registration_ids
            },
            data: {
              collapsekey: 'Message',
              android_channel_id: "Message Notification",
              title: title,
              body: body,
              sound: "message.mp3",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              ...additionalInfo
              // token: token
            }
          };

          sendMobilePushNotification(message_log.receiver_info.id, fcmData, message_log.sender, 'android');
          var fcmData = {
            // to: subscription.fcm_token,
            data: {
              collapsekey: 'Message',
              android_channel_id: "Message Notification",
              title: title,
              body: body,
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              ...additionalInfo
              // token: token
            },
            "notification": {
              "title": title,
              "body": body,
              // "content_available": true,
              sound: "message.mp3",
            },
          };
          sendMobilePushNotification(message_log.receiver_info.id, fcmData, message_log.sender, 'ios');
        }
      }
    });
  },
  eventReminder: async () => {
    var now = new Date();
    var start = new Date(now);

    var end = new Date(now);
    end.setMinutes(end.getMinutes() + 1);
    end.setSeconds(end.getSeconds() + 50);

    var user_events = await db.user_event.findAll({
      where: { start: { [Op.gte]: start, [Op.lte]: end }, calendarId: { [Op.ne]: 5 } },
      include: [{
        model: db.user,
        as: 'user',
        include: ['user_role']
      },]
    });
    user_events.forEach(async event => {

      var titleBody = await getMobilePushNotificationTemplate('USER_EVENT', {
        title: event.title
      }, event.user.lang);
      if (titleBody) {
        var url = null;
        if (event.booking_id && event.user && event.user.user_role) {
          var returnUrl = `/my-consultation/${btoa(event.booking_id).replace(/=/g, '')}`;
          switch (event.user.user_role.role_id) {
            case 1:
              url = `${config.domains.doctor}/${encodeURIComponent(returnUrl)}`;
              break;
            case 2:
              url = `${config.domains.patient}/${encodeURIComponent(returnUrl)}`;
              break;

          }
        }
        sendWebPushNotification(event.user_id, titleBody.title, titleBody.body, url);
        await event.update({ calendarId: 5, isReadOnly: true });
      }
    });

  }
};

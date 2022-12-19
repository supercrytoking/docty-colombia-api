/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
const { addActivityLog } = require('./activityLog');
const { scheduleTimeFormat, councelling_link, councelling_type, generateToken, TIME_ZONE_TRANSFORM } = require('../commons/helper');

const { crmTrigger, monitorNotificationTrigger, getMobilePushNotificationTemplate, sendMobilePushNotification, sendWebPushNotification } = require('../commons/crmTrigger');
const { smsTrigger } = require('../commons/smsCrmTrigger');
const { createPDF } = require('../commons/pdfUtil.booking');
const config = require(__dirname + '/../config/config.json');
const btoa = require('btoa');
const { user, family } = require("../models");
const { Slots, resolveConflict } = require("../commons/slots");
const { verifyFamilyMember } = require('../commons/patientMiddleware');
const { serverMessage } = require('../commons/serverMessage');

var acceptRejectSchedule = async (req, res, isACCEPT) => {
    try {
        let data = req.body;
        if (req.user && req.user.id && data.id) {
            var bookingStatus = !!isACCEPT ? 'accepted' : 'rejected';

            let book = await db.booking.findOne({
                where: { id: data.id },
                include: [{
                    model: db.user.scope('publicInfo', 'contactInfo', 'timezone'),
                    foreignKey: 'provider_id',
                    as: 'providerInfo',

                }, {
                    model: db.userFamilyView.scope('publicInfo', 'contactInfo', 'timezone'),
                    foreignKey: 'patient_id',
                    as: 'patientInfo',
                },
                    'schedule',
                {
                    model: db.booking_support,
                    as: 'booking_support',
                    include: ['support_with']
                }
                ]
            });

            // book = JSON.parse(JSON.stringify(book));

            var resp;

            var support_name;
            var support_picture;


            var patient = book.patientInfo;
            var provider = book.providerInfo;
            var self = provider;
            var requested_for = patient.fullName;

            var trigger = isACCEPT ? 'Consultation_Request_Accepted' : 'Consultation_Request_Rejected';
            if (+book.patient_id !== +req.user.id) trigger = `${trigger}_Family`;
            var trigger_self = 'Consultation_Request_Rejection_Note';

            if (book.booking_support && book.booking_support.provider_id == req.user.id) {
                trigger = isACCEPT ? 'Consultation_Support_Request_Accepted' : 'Consultation_Support_Request_Rejected';
                var trigger_self = 'Consultation_Request_Support_Rejection_Note';

                resp = await db.booking_support.update({ status: bookingStatus }, { where: { id: book.booking_support.id } });

                addActivityLog({ user_id: req.user.id, type: 'Counselling Support Request', details: `${data.status}` });
            } else {
                resp = await db.booking.update({ status: bookingStatus }, { where: { id: data.id } });
                addActivityLog({ user_id: req.user.id, type: (isACCEPT ? 'Counselling Request Accept' : 'Counselling Request Reject'), details: `${data.status}` });
            }

            if (book.booking_support && book.booking_support.support_with) {
                support_name = book.booking_support.support_with.fullName;
                support_picture = book.booking_support.support_with.picture;
                self = book.booking_support.support_with;
            }

            if (!isACCEPT) { // if reject
                var booking_update_request = {
                    booking_id: data.id,
                    reason: data.description,
                    old_provider_id: req.user.id,
                    new_provider_id: req.user.id, // no transferring
                    status: 'rejected',
                    by_user: req.user.id // req.user.id can be clinic
                };
                await db.booking_update_request.create(booking_update_request); // save reject reason with `booking_update_request` table
            }

            var schedule = book.schedule;
            if (!!!isACCEPT) { //only reject: free schedule
                await db.schedule.update({
                    calendarId: 4,
                    isReadOnly: false,
                    title: "Disponible/Available",
                    state: "Free"
                }, { where: { id: book.schedule_id } });
            }

            try {

                var hash = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
                await db.token.create({ userId: patient.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
                var returnUrl = `/my-consultation/${btoa(book.id).replace(/=/g, '')}`;
                let cl = await db.associate.findOne({ where: { associate: book.provider_id } });
                let clinic_id = null;
                if (!!cl && !!cl.user_id) {
                    clinic_id = cl.user_id || null
                }
                crmTrigger(trigger, {
                    email: patient.email,
                    consultation_id: book.reference_id,
                    your_name: patient.fullName,
                    clinic_id: clinic_id,
                    patient_name: patient.fullName,
                    patient_picture: `${patient.picture}`,

                    provider_name: provider.fullName,
                    provider_picture: provider.picture,

                    support_name: support_name,
                    support_picture: support_picture,
                    requested_for: requested_for,

                    type: councelling_type(book.councelling_type),
                    time: scheduleTimeFormat(schedule, patient.timezone_offset),
                    link: `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
                    rejected_remarks: data.description
                }, patient.lang || req.lang);

                if (isACCEPT) {
                    try {
                        var titleBody = await getMobilePushNotificationTemplate('Consultation_Request_Accepted', {}, patient.lang || req.lang);
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
                                    collapsekey: 'Consultation_Request_Accepted',
                                    android_channel_id: "Message Notification",
                                    title: title,
                                    body: body,
                                    sound: "message.mp3",
                                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                                    // token: token
                                }
                            };

                            sendMobilePushNotification(patient.id, fcmData, req.user.id, 'android');
                            var fcmData = {
                                // to: subscription.fcm_token,
                                data: {
                                    collapsekey: 'Consultation_Request_Accepted',
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
                            sendMobilePushNotification(patient.id, fcmData, req.user.id, 'ios');
                            sendWebPushNotification(patient.id, title, body, `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`);
                        }

                        var eventStart = new Date(schedule.start);
                        var eventEnd = new Date(schedule.end);

                        var p_user_event = await db.user_event.findOrCreate({ where: { user_id: patient.id, booking_id: book.id, } });

                        await p_user_event[0].update({
                            user_id: patient.id,
                            title: `Video call with Dr. ${book.providerInfo.fullName}`,
                            calendarId: 2,
                            start: new Date(eventStart),
                            end: new Date(eventEnd),
                            category: "time",
                            isAllDay: false,
                            isReadOnly: false,
                            state: 'Pending',
                            booking_id: book.id,
                            data: { type: 'booking' }
                        });

                        await db.user_event.create({
                            user_id: provider.id,
                            title: `Video call with  ${book.patientInfo.fullName}`,
                            calendarId: 2,
                            start: new Date(eventStart),
                            end: new Date(eventEnd),
                            category: "time",
                            isAllDay: false,
                            isReadOnly: false,
                            state: 'Pending',
                            booking_id: book.id,
                            data: { type: 'booking' }
                        });

                    } catch (e) {

                    }

                }

                if (!isACCEPT) {
                    monitorNotificationTrigger(trigger, { booking_id: req.body.id, with: book.providerInfo, by: book.patientInfo, user: req.user, user_name: req.user.fullName, patient_name: patient.fullName, provider_name: provider.fullName });
                    await db.user_event.destroy({ where: { booking_id: book.id, } });
                }

                if (book.booking_support && book.booking_support.provider_id == req.user.id) { //co-doctor: accept or reject: send email to provider(nurse)
                    trigger = isACCEPT ? 'Consultation_Support_Request_Accepted_Nurse' : 'Consultation_Support_Request_Rejected_Nurse';

                    crmTrigger(trigger, {
                        email: provider.email,
                        consultation_id: book.reference_id,
                        your_name: patient.fullName,

                        patient_name: patient.fullName,
                        patient_picture: `${patient.picture}`,

                        provider_name: provider.fullName,
                        provider_picture: provider.picture,

                        support_name: support_name,
                        support_picture: support_picture,

                        type: councelling_type(book.councelling_type),
                        time: scheduleTimeFormat(schedule, provider.timezone_offset),
                        link: `${config.domains.nurse}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
                        rejected_remarks: data.description
                    }, provider.lang || req.lang);
                }

                if (book.provider_id == req.user.id && book.booking_support && book.booking_support.support_with) { // nurse: accept or reject: send email to support(doctor)
                    trigger = isACCEPT ? 'Consultation_Request_Accepted_Doctor' : 'Consultation_Request_Rejected_Doctor';
                    crmTrigger(trigger, {
                        email: book.booking_support.support_with.email,
                        consultation_id: book.reference_id,
                        your_name: patient.fullName,

                        patient_name: patient.fullName,
                        patient_picture: `${patient.picture}`,

                        provider_name: provider.fullName,
                        provider_picture: provider.picture,
                        requested_for: requested_for,

                        support_name: support_name,
                        support_picture: support_picture,

                        type: councelling_type(book.councelling_type),
                        time: scheduleTimeFormat(schedule, book.booking_support.support_with.timezone_offset),
                        link: `${config.domains.nurse}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
                        rejected_remarks: data.description
                    }, book.booking_support.support_with.lang || req.lang);
                }

                // SMS Trigger
                if (isACCEPT) {
                    smsTrigger('Booking_Accept_To_Patient', {
                        doctor_name: provider.fullName,
                        request_number: book.reference_id,
                        patient_name: patient.fullName,
                        link: `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
                        to: patient.isd_code + patient.phone_number,
                        time: scheduleTimeFormat(schedule, provider.timezone_offset)
                    }, req.headers['lang'], 0);

                    // let events = ["Reminder_To_Doctor_1_Minute", "Reminder_To_Doctor_10_Minute", "Reminder_To_Patient_1_Minute", "Reminder_To_Patient_10_Minute"];
                    // for (let index = 0; index < 4; index++) {

                    //   smsTrigger(events[index], {
                    //     doctor_name: provider.fullName,
                    //     request_number: book.reference_id,
                    //     patient_name: patient.fullName,
                    //     link: `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
                    //     to: index >= 2 ? patient.isd_code + patient.phone_number : provider.isd_code + provider.phone_number,
                    //     time: scheduleTimeFormat(schedule, provider.timezone_offset)
                    //   }, req.headers['lang'], index % 2 == 0 ? 1 : 10);
                    // }
                } else if (!isACCEPT) {
                    smsTrigger("Booking_Reject_To_Patient", {
                        doctor_name: provider.fullName,
                        request_number: book.reference_id,
                        patient_name: patient.fullName,
                        to: patient.isd_code + patient.phone_number,
                        rejected_remarks: data.description
                    }, req.headers['lang'], 0);

                }

                if (!isACCEPT) {
                    var hash = await generateToken({ name: self.first_name, group: 'client', role: 3 });
                    await db.token.create({ userId: self.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
                    var returnUrl = `/my-consultation/${btoa(book.id).replace(/=/g, '')}`;

                    crmTrigger(trigger_self, {
                        email: req.user.email,
                        consultation_id: book.reference_id,

                        provider_name: provider.fullName,
                        provider_photo: provider.picture,

                        patient_name: patient.fullName,
                        patient_photo: patient.picture,

                        support_name: support_name,
                        support_picture: support_picture,

                        type: councelling_type(book.councelling_type),
                        time: scheduleTimeFormat(schedule, self.timezone_offset),
                        link: `${config.domains.doctor}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
                        rejected_remarks: data.description
                    }, req.lang);
                }

                if (config.support_email) {
                    crmTrigger('Schedule_Change_Support_Notified', {
                        email: config.support_email,
                        consultation_id: book.reference_id,
                        your_name: patient.fullName,
                        provider_name: provider.fullName,

                        support_name: support_name,
                        support_picture: support_picture,

                        type: councelling_type(book.councelling_type),
                        time: scheduleTimeFormat(schedule, self.timezone_offset),
                        provider_photo: provider.picture,
                        link: councelling_link(book),
                        rejected_remarks: data.description
                    }, req.lang);
                }

            } catch (e) {
                console.log(e);
            }

            res.send(resp);

        } else {
            res.sendStatus(406);
        }
    } catch (error) {
        console.log(error);
        res.status(400).send({
            status: false,
            errors: `${error}`
        });
    }
};

async function getBookedBy(user, patient_id) {
    if (!!!patient_id) {
        return null;
    }
    if (user.role == '2') {
        return user.id
    }
    let sql = `SELECT * FROM user_kindreds WHERE member_id = ${patient_id}`;
    return db.sequelize.query(sql).spread((r, m) => {
        let d = r[0] || null;
        if (!!!d) return patient_id;
        if (!!d.allow_access) return d.member_id
        return d.user_id;
    }).catch(r => null)
}

module.exports = {
    setSchedule: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            if (!!!data.patient_id)
                data['patient_id'] = req.user.id;
            data.payment_status = 'pending';
            if (!!!data.booked_by)
                data['booked_by'] = await getBookedBy(req.user, data.patient_id)
            let v = Date.now();
            let str = v.toString(16);
            data['reference_id'] = str.toUpperCase();
            data['title'] = data.service_name;
            if (!!!data.patient_id)
                data['patient_id'] = req.user.id;
            if (!!!data.user_id)
                data['user_id'] = req.user.id;
            if (!!data.id) {
                return db.booking.update(data, { where: { id: data.id } }).then(rr => {
                    return res.send(rr);
                }).catch(err => {
                    return res.status(400).send({
                        status: false,
                        error: `${err}`,
                        errors: err
                    });
                })
            }
            db.booking.create(data).then(async resp => {
                addActivityLog({ user_id: req.user.id, type: 'New Booking', details: `User ${req.user.email} created new schedule` });
                if (!!data.covid_id) {
                    await db.covid_checker.update({ booking_id: resp.id }, { where: { id: data.covid_id } })
                }
                return res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    error: `${err}`,
                    errors: err
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    setBookingExtras: async (req, res) => {
        try {
            let user = req.user.id;
            let id = req.body.id;
            let data = req.body.data;
            let book = await db.booking.findOne({
                where: {
                    id: id,
                    [Op.or]: [
                        { patient_id: user },
                        { provider_id: user }
                    ]
                }
            })
            if (!!book) {
                let extras = book.extras || {};
                if (typeof extras == 'string') extras = JSON.parse(extras);
                for (let k in data) {
                    extras[k] = data[k]
                }
                await book.update({ extras })
            }
            res.send({ status: true, data: book })
        } catch (error) {
            res.status(400).send({ status: false, errors: error, error: `${error}` })
        }
    },
    getPermittedSchedules: async (req, res) => {
        try {
            let user = req.user.id;
            let ref = req.params.reference_id;
            let book = await db.booking.findOne({
                where: {
                    reference_id: ref,
                    [Op.or]: [
                        { patient_id: user },
                        { provider_id: user }
                    ]
                }
            })
            let extras = null;
            if (!!book) {
                extras = book.extras || {};
                if (typeof extras == 'string') extras = JSON.parse(extras);
            }
            if (!!extras && !!extras.historyPermited) {
                return db.booking.findAll({
                    where: {
                        patient_id: book.patient_id,
                        status: 3
                    },
                    include: ['providerInfo', 'patientInfo', 'schedule'],
                    limit: 50,
                    order: [
                        ['id', 'DESC']
                    ]
                })
                    .then(resp => res.send(resp))
                    .catch(e => res.status(400).send({ status: false, error: `${e}` }))
            } else {
                return res.send([]);
            }
        } catch (error) {
            res.status(400).send({ status: false, error: `${error}` })
        }
    },
    createBookingForAnanysis: async (req, res, next) => {
        try {
            if (req.user && req.user.id) {
                let data = req.body;
                let v = Date.now();
                let str = v.toString(16);
                const sixToken = Math.floor(100000 + Math.random() * 900000);
                if (req.user.role == 2) {
                    data['booked_by'] = req.user.id;
                } else {
                    data['booked_by'] = await getBookedBy(req.user, data.patient_id);
                }
                data['digit_token'] = '' + sixToken;
                if (!!!data.reference_id)
                    data['reference_id'] = str.toUpperCase();
                data['title'] = data.service_name;
                if (!!!data.patient_id && !!!data.id) {
                    data['patient_id'] = req.user.id;
                }
                if (data.amount) {
                    delete data.amount;
                }

                if (data.id) {
                    let book = await db.booking.findByPk(data.id, { include: ['patientInfo'] })
                    data['booked_by'] = await getBookedBy(req.user, book.patient_id);
                    if (book.schedule_id !== data.schedule_id) {
                        await db.schedule.update({
                            calendarId: 4,
                            isReadOnly: false,
                            title: "Disponible/Available",
                            state: "Free"
                        }, { where: { id: book.schedule_id } }).catch(e => { })
                        await db.schedule.update({
                            // calendarId: 3,
                            isReadOnly: true,
                            title: book.patientInfo.fullName,
                            state: 'Busy'
                        }, { where: { id: data.schedule_id } });
                    }
                    book.update(data).then(async resp => {
                        addActivityLog({ user_id: req.user.id, type: 'Provider selected' });
                        return res.send(book);
                    }).catch(err => {
                        console.log(err);
                        res.status(400).send({
                            status: false,
                            error: `${err}`
                        });
                    });
                    return;
                }
                if (data.booked_by !== data.patient_id) {
                    let p = await verifyFamilyMember(req, data.patient_id, data.booked_by);
                    if (!!!p) {
                        return res.status(409).send({
                            success: false,
                            status: false,
                            data,
                            errors: serverMessage('SERVER_MESSAGE.UN_AUTHOROZED_ACCESS', req.lang)
                        });
                    }
                }

                if (data.dignosis_id && data.patient_id) {
                    let booking = await db.booking.findOne({
                        include: ['patientInfo'],
                        where: { dignosis_id: data.dignosis_id, patient_id: data.patient_id }
                    });
                    if (!!booking) {
                        data.description = data.description || " "
                        booking.update(data).then(async resp => {
                            await db.schedule.update({
                                // calendarId: 3,
                                isReadOnly: true,
                                title: book.patientInfo.fullName,
                                state: 'Busy'
                            }, { where: { id: data.schedule_id } });
                            await addActivityLog({ user_id: req.user.id, type: 'Symptoms_checked', details: `User ${req.user.email} Sympptom checked` });
                            return res.send(resp);
                        }).catch(err => {
                            res.status(400).send({
                                status: false,
                                error: `${err}`
                            });
                        });
                        return;
                    }
                }

                db.booking.create(data).then(async resp => {
                    data['description'] = data.description || " hello"
                    addActivityLog({ user_id: req.user.id, type: 'New Booking', details: `User ${req.user.email} created new schedule` });
                    return res.send(resp);
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`,
                        errorObj: err
                    });
                });
            } else {
                res.sendStatus(406);
            }
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: `${error}`,
                errorObj: error
            });
        }
    },
    createBookingSupport: async (req, res, next) => {
        try {
            if (req.user && req.user.id) {
                var data = req.body;
                await db.booking_support.destroy({ where: { booking_id: data.booking_id } });
                db.booking_support.create(data).then(async resp => {
                    return res.send(resp);
                }).catch(err => {
                    res.status(400).send({
                        status: false,
                        errors: `${err}`
                    });
                });
            } else {
                res.sendStatus(406);
            }
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: `${error}`
            });
        }
    },
    // Doctor And Clinic -> suggest change time slot
    createConstultationScheduleChangeRequest: async (req, res, next) => {
        try {
            if (req.user && req.user.id) {
                let data = req.body;
                try {
                    var booking_update_request = {
                        booking_id: data.id,
                        reason: data.description,
                        old_provider_id: data.provider_id,
                        new_provider_id: data.provider_id, // no transferring
                        status: 0,
                        by_user: req.user.id // req.user.id can be clinic
                    };

                    let request = await db.booking_update_request.create(booking_update_request);
                    var scheduleList = data.scheduleList || [];
                    scheduleList.forEach(async schedule => {
                        await db.booking_update_schedule.create({ request_id: request.id, booking_id: data.id, schedule_id: schedule.id });
                        await db.schedule.update({ state: 'Busy' }, { where: { id: schedule.id } });
                    });

                    let book = await db.booking.findOne({
                        where: { id: data.id },
                        include: ['providerInfo', 'patientInfo', 'schedule']
                    });
                    book = JSON.parse(JSON.stringify(book));
                    var patient = book.patientInfo;
                    var provider = book.providerInfo;

                    if (patient && provider) {
                        var OldTime = '';
                        var new_time1 = '';
                        var new_time2 = '';

                        var schedule = book.schedule;
                        if (schedule) OldTime = scheduleTimeFormat(schedule, patient.timezone_offset);
                        if (scheduleList[0]) new_time1 = scheduleTimeFormat(scheduleList[0], patient.timezone_offset);
                        if (scheduleList[1]) new_time2 = scheduleTimeFormat(scheduleList[1], patient.timezone_offset);

                        var hash = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
                        await db.token.create({ userId: patient.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
                        var returnUrl = `/my-consultation/${btoa(book.id).replace(/=/g, '')}`;
                        let cl = await db.associate.findOne({ where: { associate: book.provider_id } });
                        let clinic_id = null;
                        if (!!cl && !!cl.user_id) {
                            clinic_id = cl.user_id || null
                        }
                        crmTrigger('Provider_Requested_Change', {
                            email: patient.email,
                            clinic_id: clinic_id,
                            subject: 'Docty Health Care: Consultation Schedule Update Request',
                            your_name: patient.fullName,
                            provider_name: provider.fullName,
                            type: councelling_type(book.councelling_type),
                            old_time: OldTime,
                            new_time1: new_time1,
                            new_time2: new_time2,
                            provider_photo: provider.picture,
                            link: `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
                            reason: data.description,

                        }, patient.lang || req.lang);


                        var titleBody = await getMobilePushNotificationTemplate('Provider_Requested_Change', {}, patient.lang || req.lang);
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
                                    collapsekey: 'Provider_Requested_Change',
                                    android_channel_id: "Message Notification",
                                    title: title,
                                    body: body,
                                    sound: "message.mp3",
                                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                                    // token: token
                                }
                            };

                            sendMobilePushNotification(patient.id, fcmData, req.user.id, 'android');
                            var fcmData = {
                                // to: subscription.fcm_token,
                                data: {
                                    collapsekey: 'Provider_Requested_Change',
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
                            sendMobilePushNotification(patient.id, fcmData, req.user.id, 'ios');
                            sendWebPushNotification(patient.id, title, body, `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`);
                        }

                        if (config.support_email) {
                            crmTrigger('Schedule_Change_Support_Notified', {
                                email: config.support_email,
                                patient_name: patient.fullName,
                                provider_name: provider.fullName,
                                type: councelling_type(book.councelling_type),
                                old_time: OldTime,
                                new_time1: new_time1,
                                new_time2: new_time2,
                                provider_photo: provider.picture,
                                link: councelling_link(book),
                                reason: data.description,
                                message: 'Provider Requested Change',
                            }, req.lang);
                        }
                    }

                    db.booking.update({ status: 'rescheduling' }, { where: { id: data.id } }).then(async resp => {
                        addActivityLog({ user_id: req.user.id, type: 'Consultation Schedule Update Request Sent' });
                        addActivityLog({ user_id: patient.id, type: 'Consultation Schedule Update Request Received' });
                        return res.send(resp);
                    }).catch(err => {
                        res.status(400).send({
                            status: false,
                            error: `${err}`
                        });
                    });
                } catch (e) { console.log(e); }
            } else {
                res.sendStatus(406);
            }
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: `${error}`
            });
        }
    },
    updateSchedule: async (req, res, next) => {
        try {

            if (req.user && req.user.id) {
                let data = req.body;

                if (data.id) {
                    let book = await db.booking.findByPk(data.id);
                    data.extras = book.extras || {};
                    if (!!data.deliveryMode) {
                        data.extras.deliveryMode = data.deliveryMode
                    }
                    if (!!data.pharmacy_location) {
                        data.extras.pharmacy_location = data.pharmacy_location
                    }
                    if (!!data.radius) {
                        data.extras.radius = data.radius
                    }
                    if (!!data.pharmacy) {
                        data.extras.pharmacy_assigned_at = new Date();
                    }
                    book.update(data).then(resp => {
                        addActivityLog({ user_id: req.user.id, type: 'Counselling Request', details: `${data.status}` });
                        return res.send(resp);
                    }).catch(err => {
                        res.status(400).send({
                            status: false,
                            error: `${err}`
                        });
                    });
                    return;
                } else {
                    res.sendStatus(406);
                }
            } else {
                res.sendStatus(406);
            }
        } catch (error) {
            console.log(error);
            res.status(400).send({
                status: false,
                errors: `${error}`
            });
        }
    },

    acceptSchedule: (req, res, next) => {
        acceptRejectSchedule(req, res, true);
    },

    rejectSchedule: (req, res, next) => {
        acceptRejectSchedule(req, res, false);

    },

    getSchedule: (req, res, next) => {
        if (req.user && req.user.id) {
            let where = {
                [Op.or]: [{ patient_id: req.user.id }, { provider_id: req.user.id }],
                // payment_status: 1
            };
            if (req.query) {
                let query = req.query;
                if (!!query.id) {
                    where['id'] = query.id;
                }
                if (!!query.from) {
                    where['createdAt'] = {
                        [Op.gte]: (new Date(query.from))
                    };
                }
                if (!!query.to) {
                    where['createdAt'] = {
                        [Op.lte]: (new Date(query.to))
                    };
                }
                if (!!query.from && !!query.to) {
                    where['createdAt'] = {
                        [Op.gte]: (new Date(query.from)),
                        [Op.lte]: (new Date(query.to))
                    };
                }
                if (!!query.family_member) {
                    where['family_member_id'] = query.family_member;
                }
            }
            db.booking.findAll({
                where: where,
                include: ['providerInfo', 'patientInfo', 'analysis', 'family_member', 'schedule'],
                order: [
                    ['createdAt', 'DESC']
                ]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.send(err);
            });
        } else {
            res.sendStatus(406).send(req);
        }
    },
    getScheduleById: async (req, res, next) => {
        db.booking.findByPk(req.params.id, {
            include: [
                'providerInfo',
                {
                    model: db.userFamilyView.scope('minimalInfo', 'contactInfo'),
                    as: 'patientInfo'
                }, 'schedule', 'booking_calls', 'analysis', 'booking_support', 'covid_analysis'
            ]
        }).then(async resp => {
            let data = JSON.parse(JSON.stringify(resp));
            let doc = await db.user_document.findOne({
                where: {
                    user_id: data.patient_id,
                    title: 'CONSULTATION_NOTE',
                    remark: {
                        [Op.like]: `%${data.reference_id}%`
                    }
                }
            });
            if (!!doc && !!doc.document_path) {
                data.hippaForm = doc.document_path.trim();
            }
            return res.send(data);
        }).catch(err => {
            res.status(400).send({ error: `${err}` });
        });
    },
    getEmergencyNo: async (req, res, next) => {
        console.log(req.params.id);
        if (req.params.id) {
            let user_id = req.params.id;
            //if (req.query && req.query.user_id) user_id = req.query.user_id;
            user.findByPk(user_id, {
                include: [{
                    model: db.user_family,
                    include: ['family_insurance', 'family_address'],
                    as: 'family'
                }]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.send({
                    status: false,
                    errors: err
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    getScheduleOnlyPatient: (req, res, next) => {
        if (req.user && req.user.id) {
            let where = {
                provider_id: req.user.id,
                payment_status: 1,
                // status: 'accepted',
                schedule_id: {
                    [Op.ne]: null
                }
            };

            db.booking.findAll({
                where,
                include: ['providerInfo', 'patientInfo', 'analysis', 'family_member', 'schedule'],
                order: [
                    ['createdAt', 'DESC']
                ]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.send(err);
            });
        } else {
            res.sendStatus(406).send(req);
        }
    },
    getScheduleSet: (req, res, next) => {
        if (req.user && req.user.id) {
            db.schedule.findByPk(req.body.id).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.send(err);
            });
        } else {
            res.sendStatus(406).send(req);
        }
    },
    getScheduleByReference: (req, res, next) => {
        if (req.user && req.user.id) {
            let reference_id = req.body.reference_id;
            let sa = [];
            if (!!req.query && !!eval(req.query.interview)) {
                sa = ['interview']
            }
            db.booking.findOne({
                where: {
                    reference_id: reference_id,
                    // status: { [Op.in]: [1, 5, 7] },
                    [Op.or]: [
                        { patient_id: req.user.id },
                        { provider_id: req.user.id },
                        { booked_by: req.user.id },
                    ]
                },
                include: ['providerInfo', 'schedule', 'booking_calls',
                    {
                        model: db.userFamilyView,
                        as: 'patientInfo',
                        include: ['emergency_contact_person']
                    },
                    {
                        model: db.symptom_analysis,
                        as: 'analysis',
                        include: sa
                    },
                    // 'bookedByUser'
                ]
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.send(err);
            });
        } else {
            res.sendStatus(403).send(req);
        }
    },
    getScheduleByDigitToken: (req, res, next) => {
        if (req.user && req.user.id) {
            let digit_token = req.body.digit_token;
            db.booking.findOne({
                where: {
                    digit_token: digit_token,
                    // status: { [Op.in]: [1, 5, 7] },
                    [Op.or]: [
                        { patient_id: req.user.id },
                        { provider_id: req.user.id }
                    ]
                },
                include: ['providerInfo', 'patientInfo', 'schedule', 'analysis', 'family_member']
            }).then(resp => {
                res.send(resp);
            }).catch(err => {
                res.send(err);
            });
        } else {
            res.sendStatus(403).send(req);
        }
    },

    setCalendarEvent: async (req, res, next) => {
        if (req.user && req.user.id) {
            let data = req.body;
            var user_id = req.user.id;
            if (req.body.user_id) {
                user_id = req.body.user_id;
            }
            data['user_id'] = user_id;
            let start = data.start._date || data.start;
            let end = data.end._date || data.end;
            let duration = data.duration;
            data['start'] = new Date(start);
            data['end'] = new Date(end);

            let query = `
      SELECT start, end, calendarId FROM schedules
      WHERE user_id= ${data.user_id} AND (
        (start < '${end}' AND end > '${start}')
        OR (start >= '${end}' AND start <= '${start}' AND end <= '${start}')
        OR (end <= '${start}' AND end >= '${end}' AND start <= '${end}')
        OR (start > '${end}' AND start < '${start}')
      )`;

            let event = await db.sequelize.query(query);
            let ev = event[0];
            if (!!!data.id && !!ev.length) {
                return res.status(400).send({
                    status: false,
                    message: 'CONFLICTING_EVENT_TIMING',
                    data: { event, data }
                });
            }
            if (data.id) {
                let schedule = await db.schedule.findByPk(data.id);
                await db.schedule.destroy({
                    where: {
                        user_id: user_id,
                        calendarId: {
                            [Op.in]: [2, 4]
                        },
                        start: {
                            [Op.gte]: schedule.start
                        },
                        end: {
                            [Op.lte]: schedule.end
                        },
                    }
                });
            }
            let slots = Slots(start, end, duration);
            slots.map(e => e.user_id = user_id);
            slots = resolveConflict(slots, ev);
            db.schedule.bulkCreate(slots).then(resp => {
                res.send({
                    status: true,
                    data: resp,
                    message: 'event created successfully.'
                });
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    getCalendarEvents: (req, res, next) => {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (req.body.user_id) {
                user_id = req.body.user_id;
            }
            let start = req.body.start;
            let end = req.body.end;
            if (!start || !end) {
                return res.status(403).send({
                    status: false,
                    errors: `Invalid date range provided`
                });
            }
            // let query = `SELECT * FROM schedules WHERE DATE(start) >= DATE("${start}") AND DATE(start) <= DATE("${end}") AND user_id = ${user_id}`;
            let query = `SELECT * FROM schedules WHERE start >= "${start}" AND start <= "${end}" AND user_id = ${user_id}`;
            if (req.body.calendarId) {
                query += ` AND calendarId IN (${req.body.calendarId})`;
            } else {
                query += ` And calendarId <> 4`;
            }
            db.sequelize.query(query).spread((resp, meta) => {
                res.send(resp);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }

    },
    deleteCalendarEvent: async (req, res, next) => {
        if (req.user && req.user.id) {
            var user_id = req.user.id;
            if (req.body.user_id) user_id = req.body.user_id;
            let schedule = await db.schedule.findOne({ where: { user_id: user_id, id: req.body.id } });
            if (!!schedule) {
                await db.schedule.destroy({
                    where: {
                        user_id: user_id,
                        calendarId: {
                            [Op.in]: [4, 5]
                        },
                        id: {
                            [Op.ne]: req.body.id
                        },
                        start: {
                            [Op.gte]: schedule.start
                        },
                        end: {
                            [Op.lte]: schedule.end
                        },
                        // isReadOnly: { [Op.ne]: 1 }
                    }
                });
            }
            let inst;
            if (!!schedule && +schedule.calendarId === 4) {
                inst = schedule.update({ calendarId: 5, isReadOnly: 1, title: 'DELETED' });
            } else {
                inst = schedule.destroy();
            }
            inst.then(resp => {
                res.send({
                    status: true,
                    data: resp,
                    message: 'event deleted successfully'
                });
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } else {
            res.sendStatus(406);
        }
    },
    createBulkEvent: async (req, res, next) => {
        if (req.user && req.user.id) {
            var user_id = req.user.id;
            if (req.body.user_id) user_id = req.body.user_id;
            console.log('user_id', user_id);
            let schedule = {
                user_id: user_id,
                title: `Available at Docty.ai`,
                calendarId: 4,
                category: 'time',
                location: (req.body.location || null),
                dueDateClass: '',
                isReadOnly: false,
                state: `Free`,
                isAllDay: false,
                start: null,
                end: null
            };
            let slots = req.body.slots;
            let promises = [];
            try {
                slots.forEach(async slot => {
                    promises.push(
                        db.schedule.findOne({ where: { start: slot.start, end: slot.end, user_id: user_id } }).then(r => {
                            if (!r) {
                                schedule.start = slot.start;
                                schedule.end = slot.end;
                                return db.schedule.create(schedule);
                            } else
                                return r;
                        })
                    );
                });
                Promise.all(promises).then(resp => {
                    res.send(resp);
                }).catch(err => {
                    res.send({
                        errors: `${err}`,
                        status: false
                    });
                });
            } catch (error) {
                res.send({
                    errors: `${error}`,
                    status: false
                });
            }
        } else {
            res.sendStatus(406);
        }
    },
    confirmBooking: (req, res, next) => {
        if (req.user && req.user.id) {
            let user_id = req.user.id;
            if (!!!req.body.reference_id) {
                throw new Error(`Unknown Reference id`);
            }
            let reference_id = req.body.reference_id;
            db.booking.findOne({
                where: {
                    patient_id: user_id,
                    reference_id: reference_id
                },
                include: ['patientInfo', 'providerInfo']
            }).then(async resp => {
                if (resp) {
                    await resp.update({ payment_status: 'paid' });
                    let schedule = await db.schedule.findByPk(resp.schedule_id);

                    if (schedule && (schedule.state == 'Free' || schedule.state == 'free')) {
                        let title = `${resp.patientInfo ? resp.patientInfo.first_name : ''} : ${resp.service_name}`;
                        let newschedule = await schedule.update({
                            title: title,
                            state: 'Busy',
                            calendarId: 3,
                            councelling_type: resp.councelling_type,
                            reference_id: resp.reference_id
                        });

                        if (newschedule) {
                            let patientSchedule = JSON.parse(JSON.stringify(newschedule));
                            patientSchedule['id'] = null;
                            patientSchedule['title'] = `${resp.providerInfo ? resp.providerInfo.first_name : ''} : ${resp.service_name}`;
                            patientSchedule['user_id'] = req.user.id;

                            db.schedule.create(patientSchedule).then(ress => {
                                res.send({
                                    status: true,
                                    message: 'Booking confirmerd...',
                                    data: ress
                                });
                            }).catch(err => {
                                res.status(400).send({
                                    status: false,
                                    errors: `${err}`
                                });
                            });
                        } else {
                            await resp.update({ status: 'error' });
                            res.status(400).send({
                                status: false,
                                errors: `something went wrong... 1`
                            });
                        }
                    } else {
                        await resp.update({ status: 'error' });
                        res.status(400).send({
                            status: false,
                            errors: `Sorry, this time slot not availabe...`
                        });
                    }

                } else {
                    res.status(400).send({
                        status: false,
                        errors: `Invalid reference...`
                    });
                }
            });
        } else {
            res.sendStatus(406);
        }
    },
    getAvailableSloat: async (req, res, next) => {
        // if (req.user && req.user.id) {
        let id = req.body.user_id;
        let start = new Date();
        let end = new Date();
        if (req.body.start) {
            start = new Date(req.body.start);
        }
        if (req.body.end) {
            end = new Date(req.body.end);
        }
        db.schedule.findAll({
            where: {
                user_id: id,
                calendarId: {
                    [Op.in]: [4]
                },
                start: {
                    [Op.gte]: start
                },
                end: {
                    [Op.lte]: end
                },
                state: {
                    [Op.ne]: 'Busy'
                }
            },
            order: [
                ['start', 'asc']
            ]
        }).then(resp => {
            let data = JSON.parse(JSON.stringify(resp));
            let schedule = data.filter(e => (new Date(e.start).getTime()) > (Date.now()));
            res.send(schedule);
        }).catch(err => {
            res.status(400).send({
                status: false,
                error: `${err}`
            });
        });
        // } else {
        //   res.sendStatus(403);
        // }
    },
    getAvailableSloatOfClinic: async (req, res, next) => {
        if (req.user && req.user.id) {
            let clinic_id = req.body.user_id; // clinic_id
            let start = new Date();
            let end = new Date();

            if (req.body.start) {
                start = new Date(req.body.start);
            }
            if (req.body.end) {
                end = new Date(req.body.end);
            }

            var myStaff = await db.user.findAll({
                include: [{
                    model: db.user_role,
                    as: 'user_role',
                    where: {
                        role_id: {
                            [Op.in]: [1, 3]
                        } //doctor & nurse
                    }
                },
                {
                    model: db.associate,
                    as: 'associate',
                    where: { user_id: clinic_id }
                }
                ]
            });
            var staffIdList = [];
            if (myStaff) staffIdList = myStaff.map(item => item.id);
            console.log(staffIdList);

            db.schedule.findAll({
                where: {
                    user_id: {
                        [Op.in]: staffIdList
                    },
                    calendarId: {
                        [Op.in]: [4]
                    },
                    start: {
                        [Op.gte]: start
                    },
                    end: {
                        [Op.lte]: end
                    },
                    state: {
                        [Op.ne]: 'Busy'
                    },
                },
                order: [
                    ['start', 'asc']
                ],
                // limit: 1
            }).then(resp => {
                let data = JSON.parse(JSON.stringify(resp));
                let schedule = data.filter(e => (new Date(e.start).getTime()) > (Date.now()));
                res.send(schedule);
            }).catch(err => {
                res.status(400).send({
                    status: false,
                    error: `${err}`
                });
            });
        } else {
            res.sendStatus(403);
        }
    },
    deleteSchedule: async (req, res, next) => {
        if (req.user && req.user.id) {
            try {
                await db.booking.destroy({ where: { id: req.body.id } });
                res.send({
                    success: true,
                    message: 'Deleted Successfully'
                });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406).send(req);
        }
    },
    async downloadCSV(req, res, next) {
        try {
            var query = req.query;

            var myStaff = await db.user.findAll({
                include: [{
                    model: db.user_role,
                    as: 'user_role',
                    where: {
                        role_id: {
                            [Op.in]: [1, 3]
                        } //doctor & nurse
                    }
                },
                {
                    model: db.associate,
                    as: 'associate',
                    where: { user_id: query.user_id }
                }
                ]
            });
            var staffIdList = [];
            if (myStaff) staffIdList = myStaff.map(item => item.id);
            staffIdList.push(query.user_id);

            let where = {
                provider_id: {
                    [Op.in]: staffIdList
                }
            };

            if (query.from) {
                where['createdAt'] = {
                    [Op.gte]: (new Date(query.from))
                };
            }
            if (query.to) {
                where['createdAt'] = {
                    [Op.lte]: (new Date(query.to))
                };
            }

            if (query.from && query.to) {
                where['createdAt'] = {
                    [Op.and]: [{
                        [Op.gte]: (new Date(query.from))
                    }, {
                        [Op.lte]: (new Date(query.to))
                    }]
                };
            }
            db.booking.findAll({
                where,
                include: ['providerInfo', 'patientInfo'],
                order: [
                    ['createdAt', 'DESC']
                ]
            }).then(resp => {
                var book_list = JSON.parse(JSON.stringify(resp));
                res.setHeader('Content-disposition', 'attachment; filename=counselling_list_csv.csv');
                res.setHeader('Content-type', 'text/csv');
                res.charset = 'UTF-8';

                var csv = 'patient,provider,counselling_type,payment status,created_at\n';
                for (var i = 0; i < book_list.length; i++) {
                    var book = book_list[i];
                    if (book.providerInfo == null) continue;
                    if (book.patientInfo == null) continue;
                    // if (book.schedule == null) continue;

                    csv += `${book.patientInfo.first_name},${book.providerInfo.first_name},${book.councelling_type},${book.payment_status},${book.createdAt}\n`;
                }

                res.write(csv);
                res.end();
            }).catch(err => {
                console.log(err);
                res.status(400).send({
                    status: false,
                    errors: `${err}`
                });
            });
        } catch (e) {
            console.log(e);
        }
    },

    async downloadpdf(req, res, next) {
        if (req.user && req.user.id) {
            try {
                createPDF(req.query.id, req)
                    .then(doc => {
                        doc.pipe(res);
                    })
                    .catch(e => {
                        throw e;
                    });
            } catch (error) {
                res.status(400).send({
                    status: false,
                    errors: error
                });
            }
        } else {
            res.sendStatus(406).send(req);
        }
    },
};
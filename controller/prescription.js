const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");
var moment = require('moment');
const { timeFormat, S3UploadToFile, scheduleTimeFormat, getTranslations, getTranslation, getAge, TIME_ZONE_TRANSFORM } = require('../commons/helper');

const { crmTrigger, monitorNotificationTrigger, getMobilePushNotificationTemplate, sendMobilePushNotification, sendWebPushNotification, otpTrigger } = require('../commons/crmTrigger');
const { smsTrigger, smsOtpTrigger } = require('../commons/smsCrmTrigger');
var xlsx = require('node-xlsx');
const { migrate } = require('../scripts/prescriptionMigrate');
const config = require('../config/config.json');

/*====Prescription API============*/
async function createUserEvent(data, book) {
    if (data.medications == null) return;
    let translation = await getTranslations(book.patientInfo.lang || 'en', ['MEDICATION']);

    data.medications.forEach(async medication => {
        if (medication.scheduleList == null) medication.scheduleList = [];
        medication.scheduleList = medication.scheduleList.filter(e => e.enabled == true);

        for (var i = 0; i < medication.scheduleList.length; i++) {
            var schedule = medication.scheduleList[i];

            var doseDuration = schedule.doseDuration;
            var doseDurationType = schedule.doseDurationType;
            var days = doseDuration;
            switch (doseDurationType) {
                case 'Days':
                    break;
                case 'Months':
                    days = days * 30;
                    break;
                case 'Hrs':
                    days = days / 24;
                    break;
                case 'Minutes':
                    days = days / 24 / 60;
                    break;
            }

            days = Math.max(days, 1); // minumum 1 event

            var EventMessage = `${medication.type} - ${medication.name} ${schedule.doseAmount} ${getTranslation(translation, 'MEDICATION', (schedule.doseType + '').toUpperCase())} - `;
            if (schedule.doseTimeFrom && schedule.doseTimeTo)
                EventMessage += `(${getTranslation(translation, 'MEDICATION', 'BETWEEN')} ${schedule.doseTimeFrom} - ${schedule.doseTimeTo}) `;
            EventMessage += `${getTranslation(translation, 'MEDICATION', (schedule.doseDetail + '').toUpperCase())} `;
            EventMessage += `${schedule.doseDuration} ${getTranslation(translation, 'MEDICATION', (schedule.doseDurationType + '').toUpperCase())}`;

            var start;
            if (schedule.doseTimeFrom == null) {
                if (schedule.doseDetail) {
                    var cr = await db.credential.findOne({ where: { key: schedule.doseDetail } });
                    if (cr) schedule.doseTimeFrom = cr.value;
                }
            }

            start = moment(schedule.doseTimeFrom, 'HH:mm aa').toDate();

            var end;
            if (schedule.doseTimeTo)
                end = moment(schedule.doseTimeTo, 'HH:mm aa').toDate();

            if (start) start.setMinutes(start.getMinutes() + (book.patientInfo.timezone_offset));
            if (end) end.setMinutes(end.getMinutes() + (book.patientInfo.timezone_offset));

            for (var xDay = 0; xDay < days; xDay++) {

                if (start.getTime() < new Date().getTime()) { // prevent create past event
                    if (start) start.setDate(start.getDate() + 1);
                    if (end) end.setDate(end.getDate() + 1);
                }

                await db.user_event.create({
                    user_id: book.patient_id,
                    title: EventMessage,
                    calendarId: 2,
                    start: new Date(start),
                    end: new Date(end || start),
                    category: "time",
                    isAllDay: false,
                    isReadOnly: false,
                    state: 'Pending',
                    booking_id: book.id,
                    data: { prescription_id: data.id, type: 'prescription' }
                });

                if (start) start.setDate(start.getDate() + 1);
                if (end) end.setDate(end.getDate() + 1);
            }
        }
    });
}

async function notifyPharmacy(pharmacy_id, prescriptio_id, lang) {
    var titleBody = await getMobilePushNotificationTemplate('New_Prescription_to_pharmacy', {}, lang);
    if (!!!titleBody) {
        titleBody = {}
    }
    var title = titleBody.title || 'New Prescription';
    var body = titleBody.body || 'You have new order. Please visit portal.';
    sendMobilePushNotification(pharmacy_id, title, body, (config.domains.pharmacy || ''))
}

async function prescriptions(req, res, next) {
    if (req.user && req.user.id) {
        let query = req.query || {};
        try {
            let sql = `SELECT p.*,
REPLACE(CONCAT(COALESCE(pt.first_name,''),' ',COALESCE(pt.middle_name,''),' ',COALESCE(pt.last_name,''),' ',COALESCE(pt.last_name_2,'')),'  ', ' ') patient_name,pt.id patient_id,
REPLACE(CONCAT(COALESCE(pr.first_name,''),' ',COALESCE(pr.middle_name,''),' ',COALESCE(pr.last_name,''),' ',COALESCE(pr.last_name_2,'')),'  ', ' ' )doctor_name, pr.id provider_id,
JSON_OBJECT('id',s.id,'start',s.start,'end',s.end) 'schedule',
JSON_OBJECT('id',b.id,'phaarmacy',b.pharmacy,'councelling_type',b.councelling_type,'createdAt',b.createdAt,'status',b.status,'payment_status',b.payment_status, 'pharmacy_assigned_at',JSON_EXTRACT(b.extras,'$.pharmacy_assigned_at')) booking,
pt.email patient_email, CONCAT("+",COALESCE(pt.isd_code,''), COALESCE(pt.phone_number,'')) patient_phone,pi.status_remark
FROM prescriptions p
JOIN bookings b ON b.reference_id = p.reference_id
JOIN users pr ON pr.id = b.provider_id
JOIN users pt ON pt.id = b.patient_id
JOIN schedules s ON s.id = b.schedule_id
LEFT JOIN associates a ON a.associate = b.provider_id
LEFT JOIN prescription_invoices pi ON pi.prescription_id = p.id
WHERE (a.user_id = ${req.user.id} OR b.pharmacy = ${req.user.id})`;
            if (!!eval(query.medication)) {
                sql += ` AND p.medications IS NOT NULL`
            }
            if (!!eval(query.new)) {
                sql += ` AND p.status IS NULL`
            }

            db.sequelize.query(sql).spread((r, m) => {
                res.send(r)
            }).catch(e => {
                res.status(400).send({
                    status: false,
                    errors: `${e}`
                });
            })
        } catch (err) {
            console.log(err);
            res.status(400).send({
                status: false,
                errors: err
            });
        }
    }
    else {
        res.sendStatus(406);
    }
}
async function prescriptionByReference(req, res, next) {
    if (req.user && req.user.id) {


        db.prescription.findOne({ where: { reference_id: req.body.reference_id } }).then(async resp => {
            if (resp === null) return res.send(null);
            if (req.body.no_translate) {
                return res.send(resp);
            }

            let translation = await getTranslations(req.lang || 'en', ['MEDICATION']);
            resp = JSON.parse(JSON.stringify(resp));

            if (typeof resp.medications === 'string') resp.medications = JSON.parse(resp.medications);
            if (typeof resp.therapies === 'string') resp.therapies = JSON.parse(resp.therapies);
            resp.medications = resp.medications || [];
            resp.medications.forEach(medicine => {

                medicine.scheduleList = medicine.scheduleList || [];
                medicine.scheduleList.forEach(schedule => {
                    if (schedule.enabled) {
                        schedule.doseDurationType = getTranslation(translation, 'MEDICATION', (schedule.doseDurationType || '').toUpperCase());
                    }
                });
            });
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}

async function prescriptionNotesByReference(req, res, next) {
    if (req.user && req.user.id) {
        db.prescription_note.findOne({ where: { reference_id: req.body.reference_id } }).then(async resp => {
            if (resp === null) return res.send(null);
            if (req.body.no_translate) {
                return res.send(resp);
            }
            resp = JSON.parse(JSON.stringify(resp));
            res.send(resp);
        }).catch(err => {
            res.status(400).send({
                status: false,
                errors: err
            });
        });

    }
    else {
        res.sendStatus(406);
    }
}

async function prescriptionPurpose(req, res, next) {
    db.prescription_Purpose.findAll({
        order: [['updatedAt', 'asc']]
    }).then(resp => {
        res.send(resp);
    }).catch(err => {
        res.status(400).send({
            status: false,
            errors: `${err}`
        });
    });
}
async function prescriptionPurposemodify(req, res, next) {
    var data = req.body;
    if (!!!data) {
        return res.status(400).send({
            status: false,
            message: 'Invalid Request'
        });
    }
    if (data.op == 'delete') {
        await db.prescription_Purpose.destroy({ where: { id: data.id } });
    } else {
        let pres = await db.prescription_Purpose.findOne({ where: { name: data.name } });
        if (!!pres) {
            await db.prescription_Purpose.update(data, { where: { name: data.name } });
        } else {
            await db.prescription_Purpose.create(data);
        }
    }

    db.prescription_Purpose.findAll({
        order: [['updatedAt', 'asc']]
    }).then(resp => {
        res.send(resp);
    }).catch(err => {
        res.status(400).send({
            status: false,
            errors: `${err}`
        });
    });
}


var pdfUtil = require('../commons/pdfUtil');

async function addPrescription(req, res, next) {
    let data = req.body;

    if (req.user && req.user.id) {

        try {
            data['user_id'] = req.user.id;
            let pres = await db.prescription.findOne({ where: { reference_id: data.reference_id } });
            if (!!pres) {
                return res.status(400).send({
                    status: false,
                    message: 'SERVER_MESSAGE.ALREADY_PRESCRIBED'
                });
            }
            let specilityAtr = ['title'];
            if (!!req.lang && req.lang == 'es') {
                specilityAtr = [['title_es', 'title']];
            }
            let book = await db.booking.findOne(
                {
                    where: { reference_id: data.reference_id, provider_id: data.user_id },
                    include: [
                        {
                            model: db.user.scope('publicInfo', 'idInfo', 'contactInfo'),
                            as: 'providerInfo',
                            include: [{
                                model: db.user_service,
                                as: 'services',
                                include: [{
                                    model: db.speciality,
                                    attributes: specilityAtr,
                                    as: 'speciality'
                                }]
                            }, 'associatedTo']
                        },
                        {
                            model: db.userFamilyView.scope('publicInfo', 'idInfo', 'timezone'),
                            as: 'patientInfo',
                        },
                        'schedule']
                }
            );
            if (!!!book) {
                return res.status(401).send({
                    status: false,
                    message: 'SERVER_MESSAGE.UN_AUTHORIZED_ACCESS'
                });
            }
            if (!['running', 'complete', 'expired', 1, 3, 10].includes(book.status)) {
                return res.status(400).send({
                    status: false,
                    message: 'SERVER_MESSAGE.RESTRICTED_ACTION'
                });
            }

            try {
                if (data.medications) {
                    data.medications.forEach(async m => {
                        if (m.medicineObj && !!!m.medicineObj.id) {// custom medicine
                            m.medicineObj.status = false;
                            var newMedicine = await db.medicine.create(m.medicineObj);
                            await db.medicine_custom.create({ user_id: data.user_id, medicine_id: newMedicine.id });
                            m.medicineObj.id = newMedicine.id;
                        }
                    });
                    createUserEvent(data, book);
                }
            } catch (e) { console.log(e); }

            let resp = await db.prescription.create(data);
            let resp1 = await db.prescription_note.create(data);
            let d = await migrate(data.reference_id);
            data.id = resp.id;
            data.createdAt = resp.createdAt;
            if (!!book.pharmacy) {
                notifyPharmacy(book.pharmacy, resp.id, req.lang)
            }
            await book.update({ status: 'complete' });
            res.send({
                status: true,
                data: resp,
                data1: resp1
            });

            try {
                var doc = await pdfUtil.createPDF(data, req);
                S3UploadToFile(doc, `${data.reference_id}.pdf`)
                    .then(async awsRes => {
                        if (awsRes == null) {
                            awsRes = {};
                        }

                        data.file = awsRes.Location;
                        await db.prescription.upsert(data);
                        var provider_service = '';
                        book.providerInfo.services.forEach(item => {
                            provider_service += `${item.service}, `;
                        });
                        var patient = book.patientInfo;
                        var provider_signature = await db.signedContract.findOne({ where: { user_id: book.provider_id, status: 1 } });
                        var template_data = {
                            patient_name: patient.fullName,
                            patient_gender: patient.gender,
                            patient_age: getAge(patient.dob),
                            patient_national_id: patient.national_id,

                            provider_signature: (provider_signature || {}).signature,
                            provider_name: book.providerInfo.fullName,
                            provider_national_id: book.providerInfo.national_id,
                            provider_speciality: provider_service,

                            pdfLink: awsRes.Location,

                            email: patient.email,
                            subject: 'New Prescription',
                            consultation_id: book.reference_id,
                            consultation_date: scheduleTimeFormat(book.schedule, book.patientInfo.timezone_offset),
                            prescription_time: timeFormat(new Date(), patient.timezone_offset)
                        };
                        crmTrigger('New_Prescription', template_data, patient.lang || req.lang || 'en');

                        if (book.patientInfo.id) {
                            let user = await db.user.findByPk(book.patientInfo.id);
                            smsTrigger('New_Prescription', {
                                doctor_name: book.providerInfo.fullName,
                                link: awsRes.Location,
                                to: user.isd_code + user.phone_number
                            }, patient.lang || req.lang || 'en', 0);
                        }

                        var titleBody = await getMobilePushNotificationTemplate('New_Prescription', {}, patient.lang || req.lang);
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
                                    collapsekey: 'New_Prescription',
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
                                    collapsekey: 'New_Prescription',
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
                            sendWebPushNotification(patient.id, title, body, awsRes.Location);
                            monitorNotificationTrigger('New_Prescription', { booking_id: book.id, by: patient, with: book.providerInfo, patient_name: patient.fullName, provider_name: book.providerInfo.fullName });
                        }


                    })
                    .catch(e => {
                        console.error(e);
                    });

            } catch (e) { console.log(e); }
        } catch (error) {
            console.log(error);
            res.status(400).send({
                status: false,
                errors: `${error}`
            });
        }

    } else {
        res.sendStatus(406);
    }
}

async function updatePrescription(req, res, next) {
    let data = req.body;
    let statusRemark = "";
    if (data.status == 0)
        statusRemark = "REJECTED"
    if (data.status == 1)
        statusRemark = "ACCEPTED"

    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            let resp = await db.prescription.upsert(data);
            if (!!statusRemark)
                await updatePIStatusRemark(data.id, { name: statusRemark, remark: (data.remark || '') })
            res.send({
                status: true,
                data: resp
            });
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: error
            });
        }
    } else {
        res.sendStatus(406);
    }
}

var invoice_link = (invoice) => {
    return '';
};
var getTotalPrice = (medications) => {
    var total = 0;

    medications.forEach(item => {
        if (item.price != null && item.price > 0) {
            total += (item.price);
            if (item.discount > 0) total -= item.discount;
        }
    });
    total = Math.max(0, total);
    return total;
};

var invoice_detail = (medications) => {
    var tableTopTr = '';
    for (var i = 0; i < medications.length; i++) {
        var item = medications[i];
        tableTopTr += `<tr>
        <td style="width: 5%;text-align: center;">${i + 1}</td>
        <td style="width: 30%;text-align: center;">${item.name}</td>
        <td style="width: 15%;text-align: center;">${item.doseType}</td>
        <td style="width: 25%;text-align: center;">${item.amount}</td>
        <td style="width: 25%;text-align: center;">$${item.price}</td>
    </tr>`;

        var tableBottomTr = ``;
        if (item.discount > 0) {
            tableBottomTr += `<tr>
            <td>${item.name}(${item.discount_type})</td>
            <td class="talr" style="text-align: center;">(-)$${item.discount}</td>
        </tr>`;
        }
    }

    var tableTop = `<table class="table table-bordered tblwrpr" style="width: 100%;">
            <thead style="border-bottom: 1px gray solid;">
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 30%;">Med.</th>
                    <th style="width: 15%;">Qty</th>
                    <th style="width: 25%;">Amount</th>
                    <th style="width: 25%;">Price</th>
                </tr>
            </thead>
            <tbody>
                ${tableTopTr}
            </tbody>
</table> `;


    var tableBottom =
        `<table class="table table-bordered tblwrpr" style="width: 100%;margin-top: 25px;margin-bottom: 25px;">
        <thead style="border-bottom: 1px gray solid;">
            <tr>
                <th style="text-align: left;padding: 20px 0;">Total</th>
                <th class="talr" style="text-align: right;padding: 20px 0;">$${getTotalPrice(medications)}</th>
            </tr>
        </thead>
        <tbody>
    ${tableBottomTr}
        </tbody>
</table> `;
    return `${tableTop}${tableBottom}`;
};
async function addPrescriptionInvoice(req, res, next) {
    let data = req.body;
    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            var pharmacy = req.user;

            let book = await db.booking.findOne({
                where: { reference_id: data.reference_id },
                include: ['providerInfo', 'patientInfo', 'schedule']
            });
            if (!!!data.id) {
                data.extras = book.extras || {}
            }
            let resp = await db.prescription_invoice.upsert(data);

            if (book == null || book.patientInfo == null || book.providerInfo == null) return;
            var patient = book.patientInfo;
            var doctor = book.providerInfo;
            var detail = invoice_detail(data.medications);

            crmTrigger('Prescription_Invoice_Created', { email: patient.email, subject: 'Docty Health Care: Prescription invoice created', your_name: `${patient.first_name} ${patient.last_name} `, pharmacy_name: `${pharmacy.fullname} `, doctor_name: `${doctor.first_name} ${doctor.last_name} `, link: invoice_link(data), invoice_detail: detail }, patient.lang || req.lang);
            res.send(resp)
        } catch (error) {
            res.status(400).send({
                status: false,
                errors: `${error}`
            });
        }
    } else {
        res.sendStatus(406);
    }
}
async function prescriptionInvoice(req, res) {
    let id = req.params.id;
    let sql = `SELECT pivn.*,
        CAST(
            JSON_OBJECT(
                "name",CONCAT_WS(' ',u1.first_name,NULLIF(u1.middle_name,''),NULLIF(u1.last_name,'')),
                "gender",u1.gender,"dob",u1.dob,"photo",u1.picture,"phone",CONCAT(u1.isd_code,u1.phone_number),"email",u1.email
                )
            AS JSON
        ) patient,
        CAST(
            JSON_OBJECT(
            "name",CONCAT_WS(' ',u2.first_name,NULLIF(u2.middle_name,''),NULLIF(u2.last_name,''),u2.last_name_2),
            "gender",u2.gender,"dob",u2.dob,"phone",CONCAT(u2.isd_code,u2.phone_number),"email",u2.email,"photo",u2.picture
            ) AS JSON
        ) prescriber
        FROM prescription_invoices pivn
        JOIN prescriptions p ON pivn.prescription_id = p.id
        JOIN bookings b ON p.reference_id = b.reference_id
        JOIN users u1 ON u1.id = b.patient_id
        JOIN users u2 ON u2.id = b.provider_id
        LEFT JOIN user_families uf ON uf.id = b.family_member_id
        WHERE prescription_id = ${id}`
    db.sequelize.query(sql)
        .spread((resp, m) => res.send(resp[0]))
        .catch(e => res.status(400).send({ status: false, error: `${e}` }))
}

async function mdecineDeliveryOtp(req, res) {
    let ref = req.params.reference_id;
    let book = await db.booking.findOne({
        where: { reference_id: ref },
        attributes: ['id', 'reference_id'],
        include: [
            {
                model: db.userFamilyView.scope(""),
                as: 'patientInfo'
            }
        ]
    })
    if (!!book && !!book.patientInfo) {
        try {
            const otp = Math.floor(100000 + Math.random() * 900000);
            let responce = await db.pin.create({ user_id: book.patientInfo.id, pin: otp, status: 0, member_id: 0 });
            await otpTrigger('Medicine_delivery_otp', {
                user_name: book.patientInfo.fullName,
                email: book.patientInfo.email, otp: otp
            }, req.lang);
            await smsOtpTrigger('Medicine_delivery_otp', {
                user_name: book.patientInfo.fullName,
                to: `${book.patientInfo.isd_code}${book.patientInfo.phone_number}`, otp: otp
            }, req.lang)
            res.send({ status: true, message: 'otp sent' })
        } catch (error) {
            res.status(400).send({ status: false, error: `${error}` })
        }
    } else {
        res.status(400).send({ status: false, error: "user not found" })
    }
}

async function updatePIStatusRemark(precroptionId, obj) {
    let pi = await db.prescription_invoice.findOne({ where: { prescription_id: precroptionId } })
    pi = JSON.parse(JSON.stringify(pi));
    let sr = pi.status_remark || {};
    sr[obj.name] = { remark: obj.remark, date: new Date() };
    return db.prescription_invoice.update({ status_remark: sr }, { where: { prescription_id: precroptionId } })
}

async function prescription_package(req, res, next) {
    let data = req.body;

    if (req.user && req.user.id) {
        data['user_id'] = req.user.id;
        try {
            var pharmacy = req.user;

            let book = await db.booking.findOne({
                where: { reference_id: data.reference_id },
                include: [
                    'providerInfo',
                    'patientInfo',
                    'schedule'
                ]
            });
            if (book == null || book.patientInfo == null || book.providerInfo == null) return;
            if (data.status == 5 || data.status == '5') {
                let otpobj = await db.pin.findOne({
                    where:
                    {
                        user_id: book.patientInfo.id,
                        pin: data.otp,
                        status: 0,
                        member_id: 0
                    }
                })
                if (otpobj) {
                    otpobj.update({ status: 1 })
                } else {
                    return res.status(400).send({ status: false, error: 'invalid otp' })
                }
            }
            var patient = book.patientInfo;
            var doctor = book.providerInfo;
            var message = '';
            let smsTrigger = 'Prescription_Package';
            let statusRemark = '';
            if (!!data.status) {
                await db.prescription.update({ status: data.status }, { where: { reference_id: data.reference_id } });
                switch (+data.status) {
                    case 3:
                        message += 'Your pharmacy has packed your medicines and Ready to dispatch.';
                        statusRemark = "PACKED";
                        break;
                    case 4:
                        smsTrigger = 'Prescription_Sipped';
                        message += 'Your medicines is out for delivery.';
                        statusRemark = "SHIPPED";
                        break
                    case 5:
                        smsTrigger = 'Prescription_Deliverd';
                        message += 'Your medicines has been delivered to you address.';
                        statusRemark = "DELIVERED";
                        break
                }
            }
            await updatePIStatusRemark(data.prescription_id, { name: statusRemark, remark: (data.remark || '') })
            crmTrigger('Prescription_Package', {
                email: patient.email,
                subject: 'Docty Health Care: Prescription package',
                your_name: `${patient.first_name} ${patient.last_name} `,
                pharmacy_name: `${pharmacy.company_name}`,
                doctor_name: `${doctor.first_name} ${doctor.last_name}`,
                message: message
            }, patient.lang || req.lang);
            smsOtpTrigger(smsTrigger, {
                to: `${patient.isd_code}${patient.phone_number}`,
                your_name: `${patient.first_name} ${patient.last_name} `,
                pharmacy_name: `${pharmacy.company_name}`,
                message: message
            }, patient.lang || req.lang)
            res.send({
                status: true,
                data: 'Success'
            });
        } catch (error) {
            console.log(error)
            res.status(400).send({
                status: false,
                errors: error
            });
        }
    } else {
        res.sendStatus(406);
    }
}

async function downloadCSV(req, res, next) {
    var query = req.query;

    var where = {};
    if (query.from) {
        where['createdAt'] = { [Op.gte]: (new Date(query.from)) };
    }
    if (query.to) {
        where['createdAt'] = { [Op.lte]: (new Date(query.to)) };
    }

    if (query.from && query.to) {
        where['createdAt'] = { [Op.and]: [{ [Op.gte]: (new Date(query.from)) }, { [Op.lte]: (new Date(query.to)) }] };
    }
    if (query.user_id == null) {
        res.status(404).send({
            status: false,
            errors: `Require user_id`
        });
        return;
    }

    var myStaff = await db.user.findAll({
        include: [{
            model: db.user_role,
            as: 'user_role',
            where: {
                role_id: { [Op.in]: [1, 3] }//doctor & nurse
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

    var prescriptionList = await db.prescription.findAll({
        include: [{
            model: db.booking, as: 'booking', include: ['patientInfo', 'schedule', 'providerInfo',
                // {
                //     model: db.user,
                //     as: 'providerInfo',
                //     where: {
                //         id: { [Op.in]: staffIdList }
                //     }
                // }
            ]
        }],
        where: where
    });
    prescriptionList = JSON.parse(JSON.stringify(prescriptionList));
    var myStaffPrescriptionList = [];
    prescriptionList.forEach(prescription => {
        if (prescription.booking == null) return;
        if (staffIdList.indexOf(prescription.booking.provider_id) >= 0) myStaffPrescriptionList.push(prescription);
    });

    var totalData = [['Prescribed By', 'Patient', 'Prescribe Time', 'Booking Time', 'Booking Description', 'Booking Amount', 'Booking Status', 'Payment', 'Prescribe File', 'Reminder', 'After Counselling Private Msg', 'Follow Up Date', 'Follow Up Comments', 'Reject Message', 'Medications', 'Therapies', 'Cups', 'Diagnostics']];
    for (var i = 0; i < myStaffPrescriptionList.length; i++) {

        var prescription = myStaffPrescriptionList[i];

        if (prescription.booking == null) continue;
        if (prescription.booking.patientInfo == null) continue;
        if (prescription.booking.providerInfo == null) continue;

        // if (typeof prescription.diagnostics != 'object') prescription.diagnostics = JSON.parse(prescription.diagnostics);

        // if (typeof prescription.therapies != 'object') prescription.therapies = JSON.parse(prescription.therapies);
        // if (typeof prescription.cups != 'object') prescription.cups = JSON.parse(prescription.cups);

        var medicationString = '';
        var therapiesString = '';
        var cupsString = '';
        var diagnosticsString = '';

        try {
            if (typeof prescription.medications != 'object') prescription.medications = JSON.parse(prescription.medications);
            prescription.medications.forEach(medicine => {
                medicationString +=
                    `${medicine.name}\n` +
                    `Commercial Description/${medicine.medicineObj.commercialDescription}\n` +
                    `Description ATC/${medicine.medicineObj.descriptionATC}\n` +
                    `Administration via/${medicine.medicineObj.viaAdministration}\n` +
                    `Active principle/${medicine.medicineObj.activePrinciple}\n`;
                medicine.scheduleList.forEach(schedule => {
                    if (!!!schedule.enabled) return;
                    medicationString += `${schedule.type}:${schedule.doseAmount} ${schedule.doseType} `;
                    if (schedule.doseTimeFrom && schedule.doseTimeTo) {
                        medicationString += `Between ${schedule.doseTimeFrom} ${schedule.doseTimeTo}, `;
                    }
                    medicationString += `${schedule.doseDuration} ${schedule.doseDurationType}`;
                    medicationString += `${schedule.note}`;
                });
                medicationString += `\n`;
            });


            if (typeof prescription.therapies != 'object') prescription.therapies = JSON.parse(prescription.therapies);
            prescription.therapies.forEach(therapies => {
                therapiesString += `${therapies}\n\n`;
            });

            if (typeof prescription.cups != 'object') prescription.cups = JSON.parse(prescription.cups);
            prescription.cups.forEach(cups => {
                cupsString += `Procedure: ${cups.process}\n`;
                cupsString += `Section: ${cups.section}\n`;
                cupsString += `Chapter: ${cups.chapter}\n`;
                cupsString += `Group: ${cups.group}\n`;
                cupsString += `Subgroup: ${cups.subgroup}\n`;
                cupsString += `\n`;
            });

            if (typeof prescription.diagnostics != 'object') prescription.diagnostics = JSON.parse(prescription.diagnostics);
            prescription.diagnostics.forEach(diagnostics => {
                diagnosticsString += `${diagnostics.title} | ${diagnostics.cie_4_char || ''}\n`;
                diagnosticsString += `${diagnostics.discription || ''}\n`;

                diagnosticsString += `\n`;
            });

        } catch (e) {
            console.log(e);
        }
        var row = [
            prescription.booking.providerInfo.fullName,
            prescription.booking.patientInfo.fullName,
            timeFormat(prescription.createdAt),
            prescription.booking ? scheduleTimeFormat(prescription.booking.schedule) : '',
            prescription.booking.description,
            prescription.booking.amount,
            prescription.booking.status,
            prescription.booking.payment_status,
            prescription.file,
            prescription.reminder,
            prescription.afterCounsellingPrivateMsg,
            prescription.followUpDate,
            prescription.followUpComments,

            prescription.rejectMessage,
            medicationString,
            therapiesString,
            cupsString,
            diagnosticsString
        ];
        totalData.push(row);
    }

    // res.setHeader('Content-disposition', 'attachment; filename=prescription_list_csv.csv');
    // res.setHeader('Content-type', 'text/csv');
    // res.charset = 'UTF-8';

    res.setHeader('Content-disposition', 'attachment; filename=prescription_list.xlsx');
    res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.charset = 'UTF-8';

    var buffer = xlsx.build([{ name: "prescription", data: totalData }]);
    res.write(buffer);
    res.end();

}

var downloadPDF = async (req, res, next) => {
    if (req.user && req.user.id && req.query && req.query.id) {
        try {
            var id = req.query.id;

            let data = await db.prescription.findOne({ where: { id: id }, include: ['note'] });

            if (typeof data.medications == 'string') data.medications = JSON.parse(data.medications);
            var r = await pdfUtil.createPDF(data, req, false);

            // res.redirect(r.Location);
            r.pipe(res);
            // res.send(r);
        } catch (error) {
            console.log(error);
            res.status(400).send({
                status: false,
                errors: error
            });
        }
    } else {
        res.sendStatus(406);
    }
};

module.exports = { prescriptions, addPrescription, prescriptionByReference, prescriptionPurposemodify, prescriptionNotesByReference, prescriptionPurpose, updatePrescription, addPrescriptionInvoice, prescription_package, downloadCSV, downloadPDF, prescriptionInvoice, mdecineDeliveryOtp };

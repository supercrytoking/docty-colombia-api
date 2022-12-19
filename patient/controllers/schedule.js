const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { crmTrigger } = require('../../commons/crmTrigger');
const { scheduleTimeFormat, councelling_type, councelling_link, generateToken } = require('../../commons/helper');
const { query } = require('express');
const btoa = require('btoa');
const config = require(__dirname + '/../../config/config.json');
const { allowedFamilyMembers } = require('../../commons/allowedFamilyMembers')


module.exports = {
  getSchedule: async (req, res, next) => {
    res.send({
      status: true, message: 'dev pending'
    })
  },
  getMyToDaysSlot: async (req, res, next) => {
    if (req.user && req.user.id) {
      let id = req.user.id;
      db.schedule.findAll({
        where: {
          user_id: id,
          calendarId: { [Op.in]: [4, 3] },
          start: { [Op.gte]: (new Date()) }
        }
      }).then(resp => {
        return response(res, resp)
      }).catch(err => {
        return errorResponse(res, err)
      })
    } else {
      res.sendStatus(403)
    }
  },
  getMyPendingRequest: async (req, res, next) => {
    if (req.user && req.user.id) {
      let attr = ['title', 'id'];
      if (req.lang == 'es') {
        attr = [['title_es', 'title'], 'id'];
      }
      let cond = {
        where: { status: 0, patient_id: req.user.id },
        include: [
          {
            model: db.schedule,
            as: 'schedule',
            where: {
              end: { [Op.gte]: (new Date()) },
            }
          },
          'providerInfo', 'bookedByUser',
          {
            model: db.speciality,
            as: 'speciality',
            attributes: attr,
            required: false,
          }
        ]
      }
      if (req.query && req.query.limit) {
        cond['limit'] = req.query.limit
      }
      db.booking.findAll(cond).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      })
    }
  },
  getUpcommingBookings: async (req, res, next) => {
    if (req.user && req.user.id) {
      let attr = ['title', 'id'];
      if (req.lang == 'es') {
        attr = [['title_es', 'title'], 'id'];
      }
      let patients = [req.user.id];
      let allowedFamily = await allowedFamilyMembers(req.user.id, 'ConsultationRetrieve');
      patients = patients.concat(allowedFamily);
      db.booking.findAll({
        where: {
          status: { [Op.in]: [0, 5, 7, 1] },
          payment_status: 1,
          patient_id: { [Op.in]: patients },
          [Op.and]: [
            // {
            //   [Op.or]: [
            //     { patient_id: req.user.id },
            //     { booked_by: req.user.id },
            //     // { "$permitedBy.permitted_to$": req.user.id }
            //   ]
            // },
            {
              [Op.or]: [
                { '$booking_update_request.id$': { [Op.ne]: null } },
                { "$schedule.end$": { [Op.gte]: (new Date()) } }
              ]
            }
          ]
        },
        include: [
          // 'permitedBy',
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            // where: { end: { [Op.gte]: (new Date()) }, }
          },
          'patientInfo',
          'providerInfo',
          {
            model: db.booking_update_request,
            as: 'booking_update_request',
            include: [
              {
                model: db.booking_update_schedule,
                as: 'slots', required: true,
                include: [{
                  model: db.schedule,
                  as: 'schedule',
                  required: true,
                  attributes: ['start', 'end', 'id'],
                  where: { end: { [Op.gte]: (new Date()) }, }
                }
                ]
              },
            ]
          },
          'booking_support',
          {
            model: db.speciality,
            as: 'speciality',
            attributes: attr,
            required: false,
          }
        ]

      }).then(resp => {
        return response(res, resp)
      }).catch(err => {
        console.log(err)
        return errorResponse(res, err)
      })
    }
  },
  acceptNewSlot: async (req, res, next) => {
    if (req.user && req.user.id) {
      var data = req.body;

      let book = await db.booking.findOne({
        where: { id: data.id }, include: [{
          model: db.user.scope(),
          foreignKey: 'provider_id',
          as: 'providerInfo',
          attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture', 'timezone_offset']
        }, {
          model: db.userFamilyView.scope(),
          foreignKey: 'patient_id',
          as: 'patientInfo',
          attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture']
        }, 'schedule',
        {
          model: db.booking_update_request,
          as: 'booking_update_request',
          include: [
            {
              model: db.booking_update_schedule,
              as: 'slots',
              include: 'schedule'
            }]
        }]
      });
      book = JSON.parse(JSON.stringify(book));
      var patient = book.patientInfo || {};
      var provider = book.providerInfo || {};
      let extslots = null;

      var oldTime = '';
      var oldSchedule = book.schedule;
      if (oldSchedule) {
        oldTime = scheduleTimeFormat(oldSchedule, provider.timezone_offset);
        await db.schedule.update({ calendarId: 4, isReadOnly: false, title: 'Available at Docty.ai' }, { where: { id: oldSchedule.id } });
      }

      var newTime = '';
      var newSchedule = await db.schedule.findOne({ where: { id: data.schedule_id } });
      if (newSchedule) {
        newTime = scheduleTimeFormat(newSchedule, provider.timezone_offset);
        await db.schedule.update({ calendarId: 3, isReadOnly: true, title: patient.fullName }, { where: { id: data.schedule_id } });
      }
      var new_slot_1 = '';
      var new_slot_2 = '';

      if (book.booking_update_request && book.booking_update_request.slots && book.booking_update_request.slots[0] && book.booking_update_request.slots[0].schedule) {
        new_slot_1 = scheduleTimeFormat(book.booking_update_request.slots[0].schedule, provider.timezone_offset);
        if (data.schedule_id !== book.booking_update_request.slots[0].schedule_id)
          extslots = book.booking_update_request.slots[0].schedule_id;
      }
      if (book.booking_update_request && book.booking_update_request.slots && book.booking_update_request.slots[1] && book.booking_update_request.slots[1].schedule) {
        new_slot_2 = scheduleTimeFormat(book.booking_update_request.slots[1].schedule, provider.timezone_offset);
        if (data.schedule_id !== book.booking_update_request.slots[1].schedule_id)
          extslots = book.booking_update_request.slots[1].schedule_id
      }

      var remarks = '';
      if (book.booking_update_request) {
        remarks = book.booking_update_request.reason
      }

      db.booking.update({ schedule_id: data.schedule_id, status: 'accepted' }, { where: { id: data.id } }).then(async resp => {

        await db.booking_update_request.update({ status: 'accepted' }, { where: { booking_id: data.id } });
        if (!!extslots) {
          await db.schedule.update({
            calendarId: 4,
            isReadOnly: false,
            title: "Disponible/Available", state: "Free"
          }, { where: { id: extslots } }).catch(e => { })
        }
        const hash = await generateToken({ name: provider.first_name, group: 'client', role: 1 });
        await db.token.create({ userId: provider.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
        var returnUrl = `/my-consultation/${btoa(book.id).replace(/=/g, '')}`;

        crmTrigger('Patient_Accepted_Change',
          {
            email: provider.email,
            consultation_id: book.reference_id,
            provider_name: `${provider.first_name} ${provider.last_name}`,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            type: councelling_type(book.councelling_type),
            old_date_time: oldTime,
            new_slot_1: new_slot_1,
            new_slot_2: new_slot_2,
            accepted_slot: newTime,
            provider_photo: provider.picture,
            patient_photo: patient.picture,

            consultation_details_link: `${config.domains.doctor}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
            patient_remarks: remarks
          }, provider.lang || req.lang);

        try {
          var user_event = await db.user_event.findOrCreate({ where: { user_id: data['patient_id'], booking_id: book.id } });
          user_event[0].update({
            user_id: data['patient_id'],
            title: `Video call requested with Dr. ${book.providerInfo.fullName}`,
            calendarId: 2,
            start: new Date(newSchedule.start),
            end: new Date(newSchedule.end),
            category: "time",
            isAllDay: false,
            isReadOnly: false,
            state: 'Pending',
            booking_id: book.id,
            data: { type: 'booking' }
          });
        } catch {

        }

        if (config.support_email) {
          crmTrigger('Schedule_Change_Support_Notified',
            {
              email: config.support_email,
              patient_name: `${patient.first_name} ${patient.last_name}`,
              provider_name: `${provider.first_name} ${provider.last_name}`,
              type: councelling_type(book.councelling_type),
              old_time: oldTime,
              new_slot_1: new_slot_1,
              new_slot_2: new_slot_2,
              accepted_slot: newTime,
              provider_photo: provider.picture,
              link: councelling_link(book),
              remarks: remarks,
              message: 'Patient Requested Accepted',
            }, req.lang);
        }

        return response(res, resp)
      }).catch(err => {
        console.log(err)
        return errorResponse(res, err)
      })
    }
  },
  cancelBooking: async (req, res, next) => {
    if (req.user && req.user.id) {
      var data = req.body
      db.booking.update({ status: 'canceled' }, { where: { id: data.id } }).then(async resp => {

        await db.booking_update_request.findOrCreate({ where: { booking_id: data.id } })
          .then(r => r[0].update({ status: 'cancelled', reason: data.description }));

        let book = await db.booking.findOne({
          where: { id: data.id }, include: [{
            model: db.user.scope(),
            foreignKey: 'provider_id',
            as: 'providerInfo',
            attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture', 'timezone_offset', 'lang']
          }, {
            model: db.userFamilyView.scope(),
            foreignKey: 'patient_id',
            as: 'patientInfo',
            attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture', 'timezone_offset', 'lang']
          }, 'schedule']
        });
        book = JSON.parse(JSON.stringify(book));
        var patient = book.patientInfo;
        var provider = book.providerInfo;

        if (patient && provider) {
          var time = '';
          var schedule = book.schedule;
          if (schedule) {
            time = scheduleTimeFormat(schedule, provider.timezone_offset);
            await db.schedule.update({ calendarId: 4, isReadOnly: false, title: 'Available at Docty.ai' }, { where: { id: schedule.id } });
          }
          const hash = await generateToken({ provider: patient.first_name, group: 'client', role: 1 });
          await db.token.create({ userId: provider.id, token: hash, expired_at: null, login_as: 0, is_for_link: true });
          var returnUrl = `/my-consultation/${btoa(book.id).replace(/=/g, '')}`;

          crmTrigger('Patient_Cancelled_Booking',
            {
              email: provider.email,
              consultation_id: book.reference_id,
              provider_name: provider.fullName,
              patient_name: patient.fullName,
              type: councelling_type(book.councelling_type),
              date_time: time,
              provider_photo: provider.picture,
              patient_photo: patient.picture,
              consultation_details_link: `${config.domains.doctor}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
              remarks: data.description
            }, provider.lang || req.lang);

          const hash2 = await generateToken({ name: patient.first_name, group: 'client', role: 2 });
          await db.token.create({ userId: patient.id, token: hash2, expired_at: null, login_as: 0, is_for_link: true });
          var returnUrl = `/my-consultation/${btoa(book.id).replace(/=/g, '')}`;

          if (schedule) {
            time = scheduleTimeFormat(schedule, patient.timezone_offset);
          }

          crmTrigger('Patient_Cancelled_Booking_Note',
            {
              email: patient.email,
              consultation_id: book.reference_id,
              provider_name: provider.fullName,
              patient_name: `${patient.first_name} ${patient.last_name}`,
              type: councelling_type(book.councelling_type),
              time: time,
              provider_photo: provider.picture,
              patient_photo: patient.picture,
              consultation_details_link: `${config.domains.patient}/setup?token=${hash}&returnUrl=${encodeURIComponent(returnUrl)}`,
              remarks: data.description
            }, patient.lang || req.lang);

          if (config.support_email) {
            crmTrigger('Schedule_Change_Support_Notified',
              {
                email: config.support_email,
                patient_name: patient.fullName,
                provider_name: provider.fullName,
                type: councelling_type(book.councelling_type),
                time: time,
                provider_photo: provider.picture,
                patient_photo: patient.picture,
                consultation_details_link: councelling_link(book),
                remarks: data.description,
                message: 'Patient Cancelled Booking',
              }, req.lang);
          }
        }


        return response(res, resp)
      }).catch(err => {
        console.log(err)
        return errorResponse(res, err)
      })
    }
  },
  getPastBookings: async (req, res, next) => {
    let statusObj = {
      waiting: 0, accepted: 5, rejected: 2, running: 1, complete: 3, error: 4, slotBusy: 6, rescheduling: 7, canceled: 8, consulted: 9, expired: 10,
      "0": "waiting", "1": "running", "2": "rejected", "3": "complete", "4": "error", "5": "accepted", "6": "slotBusy", "7": "rescheduling", "8": "canceled", 9: "consulted", "10": "expired"
    }
    if (req.user && req.user.id) {
      let page = 1;
      let endPoint = new Date();
      let patients = [req.user.id];
      let allowedFamily = await allowedFamilyMembers(req.user.id, 'ConsultationRetrieve');
      console.log(allowedFamily)
      patients = patients.concat(allowedFamily);
      let whereMain = {
        patient_id: { [Op.in]: patients },
        [Op.and]: [
          // {
          //   [Op.or]: [
          //     { booked_by: req.user.id },
          //     { patient_id: req.user.id },
          //     // { "$permitedBy.permitted_to$": req.user.id }
          //   ]
          // },
          {
            [Op.or]: [
              { status: { [Op.in]: [2, 3, 8, 9, 10] } },
              { '$schedule.end$': { [Op.lte]: endPoint } }
            ]
          }
        ]
      }
      if (req.query && req.query.status) {
        whereMain.status = statusObj[req.query.status]
      }
      if (req.query && req.query.to) {
        let e = new Date(req.query.to).getTime();
        e = e + (24 * 60 * 60 * 1000);
        endPoint = new Date(e)
        whereMain = {
          '$schedule.end$': { [Op.lte]: endPoint },
          [Op.or]: [
            { booked_by: req.user.id },
            { patient_id: req.user.id },
            // { "$permitedBy.permitted_to$": req.user.id }
          ]
        }
      }

      if (req.query && req.query.from) {
        let from = new Date(req.query.from);
        whereMain = {
          [Op.and]:
            [
              {
                [Op.or]: [
                  { booked_by: req.user.id },
                  { patient_id: req.user.id },
                  // { "$permitedBy.permitted_to$": req.user.id }
                ]
              }, {
                [Op.and]: [
                  { '$schedule.end$': { [Op.lte]: endPoint } },
                  { '$schedule.end$': { [Op.gte]: from } }
                ]
              }
            ]
        };
      }
      if (req.query && req.query.page) {
        page = req.query.page;
      }

      if (req.query && req.query.patient_id) {
        whereMain['patient_id'] = req.query.patient_id;
      }
      if (req.query && req.query.user_id) {
        whereMain['patient_id'] = req.query.user_id;
      }
      let providerInfo = {
        model: db.user.scope('minimalInfo'),
        as: 'providerInfo',
        required: true
      }
      if (req.query && req.query.clinic_id) {
        providerInfo.include = [
          'associatedTo'
        ]
        whereMain['$providerInfo.associatedTo.user_id$'] = req.query.clinic_id;
      }
      let attr = ['title', 'id'];
      if (req.lang == 'es') {
        attr = [['title_es', 'title'], 'id'];
      }
      db.booking.findAndCountAll({
        where: whereMain,
        include: [
          {
            model: db.schedule.scope('essentialsOnly'),
            as: 'schedule'
          },
          providerInfo,
          // 'permitedBy',
          'patientInfo',
          'booking_update_request', 'booking_support',
          {
            model: db.speciality,
            as: 'speciality',
            attributes: attr,
            required: false,
          }
        ],
        order: [['createdAt', 'desc']],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err)
      })
    }
  }
}
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { scheduleTimeFormat, councelling_link, councelling_type } = require('../../commons/helper');

const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

const { crmTrigger } = require('../../commons/crmTrigger');

const config = require(__dirname + '/../../config/config.json');

var getStaffIDList = async (clinic_id) => {
  try {
    var staffIdList = [];
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
        where: { user_id: clinic_id }
      }
      ]
    });

    if (myStaff) staffIdList = myStaff.map(item => item.id);
  } catch (e) {
    console.log(e);
  }
  return staffIdList;
}

var getCusmoerIDList = async (clinic_id) => {
  var staffIdList = [];
  try {

    var myStaff = await db.user.findAll({
      include: [
        {
          model: db.customer,
          as: 'customer',
          where: { user_id: clinic_id }
        }
      ]
    })
    if (myStaff) staffIdList = myStaff.map(item => item.id);
  } catch (e) {
    console.log(e);
  }
  return staffIdList;
}

module.exports = {
  getScheduleOfStaff: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let page = 1;
        if (req.query && req.query.page) {
          page = req.query.page;
        }
        let isUpcomming = false;
        if (req.body && req.body.isUpcomming) {
          isUpcomming = req.body.isUpcomming;
        }

        let endPoint = new Date();
        let where = {
          payment_status: { [Op.in]: [1, 'paid'] },
          provider_id: { [Op.in]: await getStaffIDList(req.user.id) },
          '$schedule.end$': { [Op.lte]: endPoint }
        };
        if (isUpcomming) {
          where['$schedule.end$'] = { [Op.gte]: endPoint }
          where['payment_status'] = 1;
        }

        if (req.body && req.body.isOngoing) {
          var now = new Date();

          where['$schedule.start$'] = { [Op.lte]: now }
          where['$schedule.end$'] = { [Op.gte]: now }
          where['payment_status'] = 1;
        }

        db.booking.findAndCountAll({
          where: where,
          include: ['schedule',
            {
              model: db.user.scope(),
              foreignKey: 'provider_id',
              as: 'providerInfo',
              attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture']
            },
            'patientInfo'],
          order: [['createdAt', 'desc']],
          limit: getLimitOffset(page)
        }).then(resp => {
          return response(res, resp)
        }).catch(err => {
          console.log(err)
          return errorResponse(res, err)
        })
      } catch (err) {
        console.log(err)
        res.status(400).send({
          status: false,
          errors: err
        })
      }
    } else {
      res.sendStatus(406).send(req)
    }
  },

  getSupportedScheduleOfStaff: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let page = 1;
        if (req.query && req.query.page) {
          page = req.query.page;
        }

        let endPoint = new Date();
        let where = {
          // patient_id: { [Op.in]: await getCusmoerIDList(req.user.id) },
          '$schedule.end$': { [Op.gte]: endPoint }
        };

        db.booking.findAndCountAll({
          where: where,
          include: ['schedule', 'providerInfo', 'patientInfo',
            {
              model: db.booking_update_request,
              as: 'booking_update_request',
              include: ['user'],
              where: {
                status: 5,//'new_booking_by_support'
                by_user: req.user.id // clinic_id
              },
              required: true
            }],
          order: [['createdAt', 'desc']],
          limit: getLimitOffset(page)
        }).then(resp => {
          return response(res, resp)
        }).catch(err => {
          console.log(err)
          return errorResponse(res, err)
        })
      } catch (err) {
        console.log(err)
        res.status(400).send({
          status: false,
          errors: err
        })
      }
    } else {
      res.sendStatus(406).send(req)
    }
  },

  patientScheduledOfStaff: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let page = 1;
        if (req.query && req.query.page) {
          page = req.query.page;
        }

        let where = {
          provider_id: { [Op.in]: await getStaffIDList(req.user.id) },
        };

        let bookingList = await db.booking.findAll({ where: where });
        let patientIds = bookingList.map(book => book.patient_id);
        db.user.findAll({
          include: [{
            model: db.covid_checker,
            as: 'covidCheckerResult',
            separate: true,
            limit: 1,
            order: [['id', 'DESC']]
          }],
          where: {
            id: { [Op.in]: patientIds }
          }
        })
          .then(resp => res.send(resp))
          .catch(err => {
            res.status(400).send({
              status: false,
              errors: err
            })
          })

      } catch (err) {
        console.log(err)
        res.status(400).send({
          status: false,
          errors: err
        })
      }
    } else {
      res.sendStatus(406).send(req)
    }
  },

  getUpcommingBookingsOfDoctor: (req, res, next) => {
    if (req.user && req.user.id) {
      console.log(req.body.user_id)
      db.booking.findAll({
        where: {
          provider_id: req.body.user_id,
          status: 5,
        },
        include: ['patientInfo',
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: { end: { [Op.gte]: (new Date()) }, }
          }],
        order: [['createdAt', 'DESC']]
      }).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.send(err)
      })
    } else {
      res.sendStatus(406).send(req)
    }
  },
  getPendingBookingsOfDoctor: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.body.user_id;
      let cond = {
        where: {
          status: { [Op.in]: [0, 7] }, // 'waiting', 'rescheduling'
          provider_id: user_id,
          // payment_status: 1
        },
        include: [
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: {
              start: { [Op.gte]: (new Date()) },
            }
          },
          'patientInfo',
          {
            model: db.booking_update_request,
            as: 'booking_update_request',
            include: [
              {
                model: db.booking_update_schedule,
                as: 'slots',
                include: ['schedule']
              },
            ]
          },]
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
  getPastBookingsOfDoctor: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.body.user_id;
      let page = 1;
      if (req.query && req.query.page) {
        page = req.query.page;
      }

      let endPoint = new Date();
      let where = {
        provider_id: user_id,
        [Op.or]: [
          { status: { [Op.in]: [2, 3, 8] } },
          { '$schedule.end$': { [Op.lte]: endPoint } }
        ]
      }
      if (req.query && req.query.to) {
        let e = new Date(req.query.to).getTime();
        e = e + (24 * 60 * 60 * 1000);
        endPoint = new Date(e);
        where = {
          provider_id: user_id,
          '$schedule.end$': { [Op.lte]: endPoint }
        }
      }

      if (req.query && req.query.from) {
        let from = new Date(req.query.from)
        where = {
          provider_id: user_id,
          [Op.and]: [
            { '$schedule.end$': { [Op.lte]: endPoint } },
            { '$schedule.end$': { [Op.gte]: from } }
          ]
        }
      }

      db.booking.findAndCountAll({
        where: where,
        include: ['schedule', 'patientInfo', 'booking_update_request'],
        order: [['createdAt', 'desc']],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp)
      }).catch(err => {
        return errorResponse(res, err)
      })
    }
  },

  // patient 's schedule of providerInfo clinic staff
  getUpcommingBookingsOfPatient: (req, res, next) => {
    if (req.user && req.user.id) {
      var clinic_id = req.user.id;
      db.booking.findAll({
        where: {
          patient_id: req.body.user_id,
          // status: 5,
          status: { [Op.in]: [0, 5, 7] },
          '$providerInfo.associatedTo.user_id$': clinic_id
        },
        include: [

          {
            model: db.user,
            as: 'providerInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
            include: [{
              model: db.associate.scope('withoutUser'),
              as: 'associatedTo',
              attributes: ['user_id', 'associate'],
            }],
          },
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: { end: { [Op.gte]: (new Date()) }, }
          }],
        order: [['createdAt', 'DESC']]
      }).then(resp => {
        res.send(resp)
      }).catch(err => {
        res.send(err)
      })
    } else {
      res.sendStatus(406).send(req)
    }
  },
  getPendingBookingsOfPatient: async (req, res, next) => {
    if (req.user && req.user.id) {
      var clinic_id = req.user.id;
      var user_id = req.body.user_id;
      let cond = {
        where: {
          status: { [Op.in]: [0, 7] },
          patient_id: user_id,
          payment_status: 1,
          '$providerInfo.associatedTo.user_id$': clinic_id
        },
        include: [
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: {
              end: { [Op.gte]: (new Date()) },
            }
          },
          {
            model: db.user,
            as: 'providerInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
            include: [{
              model: db.associate.scope('withoutUser'),
              as: 'associatedTo',
              attributes: ['user_id', 'associate'],
            }],
          },

          {
            model: db.booking_update_request,
            as: 'booking_update_request',
            include: [
              {
                model: db.booking_update_schedule,
                as: 'slots',
                include: ['schedule']
              },
            ]
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
  getPastBookingsOfPatient: async (req, res, next) => {
    if (req.user && req.user.id) {
      var clinic_id = req.user.id;
      var user_id = req.body.user_id;
      let page = 1;
      if (req.query && req.query.page) {
        page = req.query.page;
      }

      let endPoint = new Date();
      let where = {
        patient_id: user_id,
        '$providerInfo.associatedTo.user_id$': clinic_id,
        [Op.or]: [
          { status: { [Op.in]: [2, 3, 8] } },
          { '$schedule.end$': { [Op.lte]: endPoint } }
        ]
      }
      if (req.query && req.query.to) {
        let e = new Date(req.query.to).getTime();
        e = e + (24 * 60 * 60 * 1000);
        endPoint = new Date(e);
        where = {
          patient_id: user_id,
          '$providerInfo.associatedTo.user_id$': clinic_id,
          '$schedule.end$': { [Op.lte]: endPoint }
        }
      }

      if (req.query && req.query.from) {
        let from = new Date(req.query.from)
        where = {
          patient_id: user_id,
          '$providerInfo.associatedTo.user_id$': clinic_id,
          '$schedule.end$':
          {
            [Op.and]: [{ [Op.lte]: endPoint }, { [Op.gte]: from }]
          },
        }
      }

      db.booking.findAndCountAll({
        where: where,
        include: [
          'schedule',
          {
            model: db.user,
            as: 'providerInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
            include: [{
              model: db.associate.scope('withoutUser'),
              as: 'associatedTo',
              attributes: ['user_id', 'associate'],
            }],
          },
        ],
        order: [['createdAt', 'desc']],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp)
      }).catch(err => {
        return errorResponse(res, err)
      })
    }
  },

  // Clinic -> suggest change time slot, provider
  transferScheduleRequest: async (req, res, next) => {
    try {
      if (req.user && req.user.id) {
        let data = req.body;
        console.log(data)
        try {

          var booking_update_request = {
            booking_id: data.id,
            reason: data.reason,
            old_provider_id: data.provider_id,
            new_provider_id: data.new_provider_id, //transferring to new doctor
            status: 'accepted',
            by_user: req.user.id
          }

          await db.booking_update_request.create(booking_update_request); // for logging

          let book = await db.booking.findOne({
            where: { id: data.id }, include: [{
              model: db.user.scope(),
              foreignKey: 'provider_id',
              as: 'providerInfo',
              attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture', 'lang']
            }, {
              model: db.userFamilyView.scope(),
              foreignKey: 'patient_id',
              as: 'patientInfo',
              attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture', 'lang']
            }, 'schedule']
          });
          book = JSON.parse(JSON.stringify(book));
          var patient = book.patientInfo;
          var provider = book.providerInfo;

          if (patient && provider) {
            var OldTime = '';
            var schedule = book.schedule;
            if (schedule) {
              OldTime = scheduleTimeFormat(schedule, patient.timezone_offset);
              await db.schedule.update({ calendarId: 4, isReadOnly: false, title: 'Available at Docty.ai' }, { where: { id: schedule.id } });
            }


            crmTrigger('Consultation_Schedule_Transfer_Patient',
              {
                email: patient.email,
                subject: 'Docty Health Care: Consultation Schedule Transfer',
                your_name: patient.fullName,
                provider_name: provider.fullName,
                support_name: `${req.user.first_name} ${req.user.last_name}`,
                type: councelling_type(book.councelling_type),
                old_time: OldTime,
                link: councelling_link(book)
              }, patient.lang || req.lang)

            if (schedule) {
              OldTime = scheduleTimeFormat(schedule, provider.timezone_offset);
            }

            crmTrigger('Consultation_Schedule_Transfer_Provider',
              {
                email: provider.email,
                subject: 'Docty Health Care: Consultation Schedule Transfer',
                your_name: provider.fullName,
                patient_name: patient.fullName,
                support_name: `${req.user.first_name} ${req.user.last_name}`,
                type: councelling_type(book.councelling_type),
                old_time: OldTime,
                link: councelling_link(book)
              }, provider.lang || req.lang);

            if (config.support_email) {
              crmTrigger('Schedule_Change_Support_Notified',
                {
                  email: config.support_email,
                  patient_name: patient.fullName,
                  provider_name: provider.fullName,
                  type: councelling_type(book.councelling_type),
                  time: OldTime,
                  provider_photo: provider.picture,
                  link: councelling_link(book),
                  message: 'Clinic make booking transfer',
                }, req.lang);
            }
          }

          await db.schedule.update({ calendarId: 3, isReadOnly: true, title: patient.fullName }, { where: { id: data.new_schedule_id } });

          db.booking.update({ status: 'accepted', provider_id: data.new_provider_id, schedule_id: data.new_schedule_id, }, { where: { id: data.id } }).then(async resp => {
            // addActivityLog({ user_id: req.user.id, type: 'Consultation Schedule Transfer Request Sent' });
            // addActivityLog({ user_id: patient.id, type: 'Consultation Schedule Transfer Request Received' });
            return res.send(resp);
          }).catch(err => {
            res.status(400).send({
              status: false,
              error: `${err}`
            })
          })
        } catch (e) { console.log(e) }
      } else {
        res.sendStatus(406)
      }
    } catch (error) {
      res.status(400).send({
        status: false,
        errors: `${error}`
      })
    }
  },
  rejectSchedule: (req, res, next) => {
    try {
      let data = req.body;
      if (req.user && req.user.id && data.id) {

        db.booking.update({ status: 'rejected' }, { where: { id: data.id } }).then(async resp => {

          var booking_update_request = {
            booking_id: data.id,
            reason: data.description,
            old_provider_id: data.provider_id,
            new_provider_id: data.provider_id, // no transferring
            status: 'rejected',
            by_user: req.user.id
          }

          await db.booking_update_request.create(booking_update_request); // save reject reason with `booking_update_request` table

          // addActivityLog({ user_id: req.user.id, type: 'Counselling Request Reject', details: `${data.status}` });
          res.send(resp);

          try {
            let book = await db.booking.findOne({ where: { id: data.id }, include: ['providerInfo', 'patientInfo', 'schedule'] });
            book = JSON.parse(JSON.stringify(book));
            var patient = book.patientInfo;
            var provider = book.providerInfo;

            var time = '';
            var schedule = book.schedule;
            if (schedule) {
              time = scheduleTimeFormat(schedule, provider.timezone_offset);
              await db.schedule.update({ calendarId: 4, isReadOnly: false, title: 'Available at Docty.ai' }, { where: { id: schedule.id } });
            }

            crmTrigger('Consultation_Request_Reject_By_Clinic_Provider', {
              email: provider.email,
              subject: 'Docty Health Care: Consultation Request Reject By Clinic',
              your_name: `${provider.first_name} ${provider.last_name}`,
              patient_name: `${patient.first_name} ${patient.last_name}`,
              type: councelling_type(book.councelling_type),
              time: time,
              link: councelling_link(book),
              reason: data.description,
              support_name: req.user.fullName
            }, provider.lang || req.lang);

            if (schedule) {
              time = scheduleTimeFormat(schedule, patient.timezone_offset);
            }

            crmTrigger('Consultation_Request_Reject_By_Clinic_Patient',
              {
                email: patient.email,
                subject: 'Docty Health Care: Consultation Request Reject By Clinic',
                your_name: `${patient.first_name} ${patient.last_name}`,
                provider_name: `${provider.first_name} ${provider.last_name}`,
                type: councelling_type(book.councelling_type),
                time: time,
                link: councelling_link(book),
                reason: data.description,
                support_name: req.user.fullName
              }, patient.lang || req.lang);

            if (config.support_email) {
              crmTrigger('Schedule_Change_Support_Notified',
                {
                  email: config.support_email,
                  patient_name: `${patient.first_name} ${patient.last_name}`,
                  provider_name: `${provider.first_name} ${provider.last_name}`,
                  type: councelling_type(book.councelling_type),
                  time: time,
                  provider_photo: provider.picture,
                  link: councelling_link(book),
                  message: "Clinic canceled staff 's booking",
                }, req.lang);
            }
          } catch (e) {
            console.log(e);
          }
        }).catch(err => {
          res.status(400).send({
            status: false,
            error: `${err}`
          })
        })
      } else {
        res.sendStatus(406)
      }
    } catch (error) {
      console.log(error)
      res.status(400).send({
        status: false,
        errors: `${error}`
      })
    }
  },
}
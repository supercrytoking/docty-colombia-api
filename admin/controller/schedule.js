/* eslint-disable no-unused-vars */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { scheduleTimeFormat, councelling_link, councelling_type, capitalize, generateToken } = require('../../commons/helper');
const { crmTrigger } = require('../../commons/crmTrigger');

const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const { Slots, resolveConflict } = require('../../commons/slots');
const { cancelBooking } = require('../../patient/controllers/schedule');
const { addActivityLog } = require('./activityLog');
const { billingDetails } = require('../../clinic/controllers/schedule');

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
};

async function getBookedBy(patient_id) {
  if (!!!patient_id) {
    return null;
  }
  // if (user.role == '2') {
  //   return user.id
  // }
  let sql = `SELECT * FROM user_kindreds WHERE member_id = ${patient_id}`;
  return db.sequelize.query(sql).spread((r, m) => {
    let d = r[0] || null;
    if (!!!d) return patient_id
    if (!!d.allow_access) return d.member_id
    return d.user_id;
  }).catch(r => null)
}

module.exports = {
  createBookingForAnanysis: async (req, res, next) => {
    try {
      if (req.user && req.user.id) {
        let data = req.body;
        let v = Date.now();
        let str = v.toString(16);

        const sixToken = Math.floor(100000 + Math.random() * 900000);

        data['reference_id'] = '' + sixToken;
        data['patient_id'] = req.body.patient_id;
        data['title'] = data.service_name;
        if (data.id) {
          let book = await db.booking.findOne({ where: { id: data.id }, include: ['providerInfo', 'patientInfo', 'schedule'] });
          if (!!!book.booked_by)
            book['booked_by'] = await getBookedBy(book.patient_id);
          if (book.schedule_id !== data.schedule_id) {
            await db.schedule.update({
              calendarId: 4,
              isReadOnly: false,
              title: "Disponible/Available", state: "Free"
            }, { where: { id: book.schedule_id } }).catch(e => { })
            await db.schedule.update({ calendarId: 3, isReadOnly: true, title: book.patientInfo.fullName, state: 'Busy' }, { where: { id: data.schedule_id } });
          }
          try {
            if (data.sendNotify) {
              book = JSON.parse(JSON.stringify(book));
              var patient = book.patientInfo;
              var provider = book.providerInfo;

              if (patient && provider) {
                var time = '';
                var schedule = book.schedule;
                if (schedule) time = scheduleTimeFormat(schedule, provider.timezone_offset);

                crmTrigger('Consultation_Request_Received', { email: provider.email, subject: 'Docty Health Care: Consultation Request', your_name: provider.fullName, patient_name: patient.fullName, type: councelling_type(book.councelling_type), time: time, link: councelling_link(book) }, provider.lang || req.lang);
                if (schedule) time = scheduleTimeFormat(schedule, patient.timezone_offset);
                crmTrigger('Consultation_Request_Sent', { email: patient.email, subject: 'Docty Health Care: Consultation Request', your_name: patient.fullName, provider_name: provider.fullName, type: councelling_type(book.councelling_type), time: time, link: councelling_link(book) }, patient.lang || req.lang);

                var user_event = await db.user_event.findOrCreate({ where: { user_id: data['patient_id'], booking_id: book.id } });
                user_event[0].update({
                  user_id: data['patient_id'],
                  title: `Video call requested with Dr. ${book.providerInfo.fullName}`,
                  calendarId: 2,
                  start: new Date(schedule.start),
                  end: new Date(schedule.end),
                  category: "time",
                  isAllDay: false,
                  isReadOnly: false,
                  state: 'Pending',
                  booking_id: book.id,
                  data: { type: 'booking' }
                });
              }
            }
          } catch (e) { console.log(e) }
          if (!!book.provider_id && !!book.schedule_id) {
            return book.update({
              provider_id: data.provider_id,
              schedule_id: data.schedule_id,
              speciality_id: data.speciality_id,
              status: 'waiting'
            })
              .then(rr => {
                addActivityLog({ user_id: req.user.id, type: 'Schedule Updated' });
                return res.send(book);
              }).catch(err => {
                res.status(400).send({
                  status: false,
                  error: `${err}`
                });
              });
          } else {
            return book.update(data).then(async resp => {
              // let book = await db.booking.findByPk(data.id);
              addActivityLog({ user_id: req.body.patient_id, type: 'Provider selected' });
              return res.send(book);
            }).catch(err => {
              res.status(400).send({
                status: false,
                error: `${err}`
              });
            });
          }
        }
        let booking = await db.booking.findOne({
          where: { dignosis_id: data.dignosis_id, patient_id: req.body.patient_id }
        });
        console.log("ddd")
        await db.schedule.update({ calendarId: 3, isReadOnly: true, title: patient.fullName, state: 'Busy' }, { where: { id: data.schedule_id } });
        if (!!booking) {
          booking.update(data).then(async resp => {
            await addActivityLog({ user_id: req.body.patient_id, type: 'Symptoms_checked' });
            return res.send(resp);
          }).catch(err => {
            res.status(400).send({
              status: false,
              error: `${err}`
            });
          });
        } else {
          if (!!!data.booked_by)
            data['booked_by'] = await getBookedBy(data.patient_id)
          db.booking.create(data).then(async resp => {
            addActivityLog({ user_id: req.body.patient_id, type: 'New Booking' });
            return res.send(resp);
          }).catch(err => {
            res.status(400).send({
              status: false,
              errors: `${err}`
            });
          });
        }
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
  cancelABooking: async (req, res, next) => {
    return cancelBooking(req, res, next)
  },

  setSchedule: async (req, res, next) => {
    if (req.user && req.user.id) {
      let data = req.body;
      let v = Date.now();
      let str = v.toString(16);
      data['reference_id'] = str.toUpperCase();
      // 
      if (!!!data.booked_by)
        data['booked_by'] = await getBookedBy(data.patient_id)
      data['title'] = data.service_name || '';
      // 
      db.booking.create(data).then(async resp => {

        if (!!resp.councelling_type && !!!resp.amount) {
          let councelling_type = await db.consultation_type_detail.findOne({
            where: {
              type_code: resp.councelling_type,
              language: req.lang || 'en'
            }
          });
          if (!!councelling_type && !!councelling_type.price) {
            await resp.update({ amount: councelling_type.price });
          }
        }

        var provider = data.provider || {};
        var patient = data.patient || {};
        var book = data;
        var time = '';
        if (book && book.schedule) time = scheduleTimeFormat(book.schedule, provider.timezone_offset);

        crmTrigger('Consultation_Request_Received', { email: provider.email, subject: 'Docty Health Care: Consultation Request', your_name: provider.fullName, patient_name: patient.fullName, type: councelling_type(book.councelling_type), time: time, link: councelling_link(book) }, provider.lang || req.lang || 'en');
        if (book && book.schedule) time = scheduleTimeFormat(book.schedule, patient.timezone_offset);
        crmTrigger('Consultation_Request_Sent', { email: patient.email, subject: 'Docty Health Care: Consultation Request', your_name: patient.fullName, provider_name: provider.fullName, type: councelling_type(book.councelling_type), time: time, link: councelling_link(book) }, patient.lang || req.lang || 'en');

        return res.send(resp);
      }).catch(err => {
        console.log(err);
        res.status(400).send({
          status: false,
          error: `${err}`
        });
      });
    } else {
      res.sendStatus(406);
    }
  },
  getSchedule: (req, res, next) => {
    if (req.user && req.user.id) {
      let where = {

        // payment_status: 1
      };
      if (req.query) {
        let query = req.query;
        if (!!query.id) {
          where['id'] = query.id;
        }
        if (!!query.from) {
          where['createdAt'] = { [Op.gte]: (new Date(query.from)) };
        }
        if (!!query.to) {
          where['createdAt'] = { [Op.lte]: (new Date(query.to)) };
        }
        if (!!query.from && !!query.to) {
          where['createdAt'] = { [Op.gte]: (new Date(query.from)), [Op.lte]: (new Date(query.to)) };
        }

      }
      db.booking.findAll({ where, include: ['providerInfo', 'patientInfo', 'analysis', 'schedule'], order: [['createdAt', 'DESC']] }).then(resp => {
        res.send(resp);
      }).catch(err => {
        res.send(err);
      });
    } else {
      res.sendStatus(406).send(req);
    }
  },
  getScheduleById: async (req, res, next) => {
    db.booking.findByPk(req.params.id, { include: ['providerInfo', 'patientInfo', 'schedule', 'booking_calls'] }).then(resp => {
      res.send(resp);
    }).catch(err => {
      res.send(err);
    });
  },
  getChangedSchedule: (req, res, next) => {
    if (req.user && req.user.id) {
      let where = {

        // payment_status: 1
      };
      if (req.query) {
        let query = req.query;
        if (!!query.id) {
          where['id'] = query.id;
        }
        if (!!query.from) {
          where['createdAt'] = { [Op.gte]: (new Date(query.from)) };
        }
        if (!!query.to) {
          where['createdAt'] = { [Op.lte]: (new Date(query.to)) };
        }

        where.status = { [Op.in]: [2, 7, 8, 10] }; // rejected, rescheduling

        if (!!query.from && !!query.to) {
          where['createdAt'] = { [Op.gte]: (new Date(query.from)), [Op.lte]: (new Date(query.to)) };
        }

      }
      console.log(where)
      db.booking.findAll({
        where,
        include: [
          {
            model: db.schedule,
            // required: false,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            // where: { end: { [Op.gte]: (new Date()) }, }
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
          },
          'providerInfo',
          'patientInfo',
          'analysis'
        ], order: [['createdAt', 'DESC']]
      }).then(resp => {
        res.send(resp);
      }).catch(err => {
        res.send(err);
      });
    } else {
      res.sendStatus(406).send(req);
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

    var attributes = [];
    if (query.includes) {
      attributes = query.includes.split(',');
    }

    db.booking.findAll({ where: where, include: ['providerInfo', 'patientInfo', 'schedule'], order: [['createdAt', 'asc']] }).then(resp => {
      var book_list = JSON.parse(JSON.stringify(resp));
      res.setHeader('Content-disposition', 'attachment; filename=counselling_list_csv.csv');
      res.setHeader('Content-type', 'text/csv');
      res.charset = 'UTF-8';

      var csv = 'patient,provider,counselling_type,payment status,created_at\n';
      if (attributes && attributes.length > 0) {
        csv = attributes.map(item => capitalize(item)).join(',') + '\n';
      }
      for (var i = 0; i < book_list.length; i++) {
        var book = book_list[i];
        if (book.providerInfo == null) continue;
        if (book.patientInfo == null) continue;
        book.patientInfo = book.patientInfo.fullName;
        book.patient = book.patientInfo.fullName;
        // book['Schedule By'] = book.patientInfo.fullName;
        book.provider = book.providerInfo.fullName;
        if (book.schedule) book.start_at = book.schedule.start;

        if (attributes && attributes.length > 0) {
          csv += attributes.map(includeColumn => book[includeColumn] || '').join(',') + '\n';
        } else {
          csv += `${book.patientInfo},${book.providerInfo.first_name},${book.councelling_type},${book.payment_status},${book.createdAt}\n`;
        }

      }

      res.write(csv);
      res.end();
    }).catch(err => {
      res.sendStatus(400).send({
        status: false,
        errors: `${err}`
      });
    });
  },
  getAvailableSloat: async (req, res, next) => {
    if (req.user && req.user.id) {
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
          calendarId: { [Op.in]: [4] },
          start: { [Op.gte]: start },
          end: { [Op.lte]: end }
        },
        order: [['start', 'asc']]
      }).then(resp => {
        let data = JSON.parse(JSON.stringify(resp));
        let schedule = data.filter(e => (new Date(e.start).getTime()) > (Date.now()));
        res.send(schedule);
      }).catch(err => {
        res.status(400).send({
          status: false, error: `${err}`
        });
      });
    } else {
      res.sendStatus(403);
    }
  },
  billingDetails: (req, res, next) => {
    return billingDetails(req, res, next)
  },

  // Admin -> suggest change time slot, provider
  transferScheduleRequest: async (req, res, next) => {
    try {
      if (req.user && req.user.id) {
        let data = req.body;
        try {

          var booking_update_request = {
            booking_id: data.id,
            reason: data.reason,
            old_provider_id: data.provider_id,
            new_provider_id: data.new_provider_id, //transferring to new doctor
            status: 'accepted',
            by_admin: req.user.id
          };

          await db.booking_update_request.create(booking_update_request); // for logging

          let book = await db.booking.findOne({ where: { id: data.id }, include: ['providerInfo', 'patientInfo', 'schedule'] });
          book = JSON.parse(JSON.stringify(book));
          var patient = book.patientInfo;
          var provider = book.providerInfo;

          if (patient && provider) {
            var OldTime = '';
            var schedule = book.schedule;
            if (schedule) {
              OldTime = scheduleTimeFormat(schedule, patient.timezoneOffset);
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
              }, patient.lang || req.lang);

            if (schedule) {
              OldTime = scheduleTimeFormat(schedule, provider.timezoneOffset);
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

  getUpcommingBookingsOfDoctor: (req, res, next) => {
    if (req.user && req.user.id) {
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
        res.send(resp);
      }).catch(err => {
        res.send(err);
      });
    } else {
      res.sendStatus(406).send(req);
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
      };
      if (req.query && req.query.to) {
        let e = new Date(req.query.to).getTime();
        e = e + (24 * 60 * 60 * 1000);
        endPoint = new Date(e);
        where = {
          provider_id: user_id,
          '$schedule.end$': { [Op.lte]: endPoint }
        };
      }

      if (req.query && req.query.from) {
        let from = new Date(req.query.from);
        where = {
          provider_id: user_id,
          [Op.and]: [
            { '$schedule.end$': { [Op.lte]: endPoint } },
            { '$schedule.end$': { [Op.gte]: from } }
          ]
        };
      }

      db.booking.findAndCountAll({
        where: where,
        include: ['schedule', 'patientInfo', 'booking_update_request'],
        order: [['createdAt', 'desc']],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },

  // patient 's upcomming schedule
  getUpcommingBookingsOfPatient: (req, res, next) => {
    if (req.user && req.user.id) {
      //var clinic_id = req.body.clinic_id;
      var where = {
        patient_id: req.body.user_id,
        status: 5
      };

      db.booking.findAll({
        where: where,
        include: [
          {
            model: db.user,
            as: 'providerInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
          },
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: { end: { [Op.gte]: (new Date()) }, }
          }],
        order: [['createdAt', 'DESC']]
      }).then(resp => {
        res.send(resp);
      }).catch(err => {
        res.send(err);
      });
    } else {
      res.sendStatus(406).send(req);
    }
  },
  getPendingBookingsOfPatient: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.body.user_id;
      var where = {
        status: { [Op.in]: [0, 7] },
        patient_id: user_id,
        payment_status: 1,
      };

      let cond = {
        where: where,
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
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name']
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
      };
      if (req.query && req.query.limit) {
        cond['limit'] = req.query.limit;
      }
      db.booking.findAll(cond).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },
  getPastBookingsOfPatient: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.body.user_id;
      let page = 1;
      if (req.query && req.query.page) {
        page = req.query.page;
      }

      let endPoint = new Date();
      let where = {
        patient_id: user_id,
        [Op.or]: [
          { status: { [Op.in]: [2, 3, 8] } },
          { '$schedule.end$': { [Op.lte]: endPoint } }
        ]
      };
      if (req.query && req.query.to) {
        let e = new Date(req.query.to).getTime();
        e = e + (24 * 60 * 60 * 1000);
        endPoint = new Date(e);
        where = {
          patient_id: user_id,
          '$schedule.end$': { [Op.lte]: endPoint }
        };
      }

      if (req.query && req.query.from) {
        let from = new Date(req.query.from);
        where = {
          patient_id: user_id,
          '$schedule.end$': {
            [Op.and]: [
              { [Op.lte]: endPoint }, { [Op.gte]: from }
            ]
          },
        };
      }


      db.booking.findAndCountAll({
        where: where,
        include: [
          'schedule',
          {
            model: db.user,
            as: 'providerInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
          },
          'booking_update_request'],
        order: [['createdAt', 'desc']],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },

  getBookingsOfStaff: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        var clinic_id = req.body.user_id;

        let page = 1;
        if (req.query && req.query.page) {
          page = req.query.page;
        }

        let isUpcomming = false;
        if (req.body && req.body.isUpcomming) {
          isUpcomming = req.body.isUpcomming;
        }

        let endPoint = new Date();
        var provider_id_list = req.body.staffList || [];
        if (provider_id_list == null || provider_id_list.length == 0) provider_id_list = await getStaffIDList(clinic_id);
        let where = {
          provider_id: { [Op.in]: provider_id_list },
          '$schedule.end$': { [Op.lte]: endPoint }
        };
        if (isUpcomming) {
          where['$schedule.end$'] = { [Op.gte]: endPoint };
        }

        db.booking.findAndCountAll({
          where: where,
          include: ['schedule', 'providerInfo', 'patientInfo'],
          order: [['createdAt', 'desc']],
          limit: getLimitOffset(page)
        }).then(resp => {
          return response(res, resp);
        }).catch(err => {
          console.log(err);
          return errorResponse(res, err);
        });
      } catch (err) {
        console.log(err);
        res.status(400).send({
          status: false,
          errors: err
        });
      }
    } else {
      res.sendStatus(406).send(req);
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
      data['start'] = new Date(start);
      data['end'] = new Date(end);
      let duration = data.duration;
      let query = `
      SELECT start, end FROM schedules
      WHERE user_id= ${data.user_id} AND (
        (start < '${end}' AND end > '${start}')
        OR (start >= '${end}' AND start <= '${start}' AND end <= '${start}')
        OR (end <= '${start}' AND end >= '${end}' AND start <= '${end}')
        OR (start > '${end}' AND start < '${start}')
      )`;
      // console.log(query)
      let event = await db.sequelize.query(query);
      let ev = event[0];
      // console.log(ev)
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
            user_id: user_id, calendarId: 4,
            start: { [Op.gte]: schedule.start },
            end: { [Op.lte]: schedule.end },
          }
        });
      }
      let slots = Slots(start, end, duration);
      slots.map(e => e.user_id = user_id);
      slots = resolveConflict(slots, ev);
      db.schedule.bulkCreate(slots).then(resp => {
        res.send({
          status: true,
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
      let query = `SELECT * FROM schedules WHERE DATE(start) >= DATE("${start}") AND DATE(start) <= DATE("${end}") AND user_id = ${user_id}`;
      if (req.body.calendarId) {
        query += ` AND calendarId IN (${req.body.calendarId})`;
        // q += ` AND calendarId = ${req.body.calendarId}`;
      } else {
        query += `  And calendarId <> 4`;
      }
      console.log(query)
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
      await db.schedule.destroy({
        where: {
          user_id: user_id,
          calendarId: { [Op.in]: [4, 5] },
          id: { [Op.ne]: req.body.id },
          start: { [Op.gte]: schedule.start },
          end: { [Op.lte]: schedule.end },
        }
      });
      let inst;
      if (!!schedule && +schedule.calendarId === 4) {
        inst = schedule.update({ calendarId: 5, isReadOnly: 1, title: 'DELETED' });
      } else {
        inst = schedule.destroy();
      }
      inst.then(resp => {
        res.send({
          status: true,
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
              }
              else
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
};
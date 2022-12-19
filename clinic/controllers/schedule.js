const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { scheduleTimeFormat, councelling_link, councelling_type } = require('../../commons/helper');

const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

const { crmTrigger, otpTrigger } = require('../../commons/crmTrigger');

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
};

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
    });
    if (myStaff) staffIdList = myStaff.map(item => item.id);
  } catch (e) {
    console.log(e);
  }
  return staffIdList;
};

module.exports = {
  getScheduleOfStaff: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let data = req.body || {};
        let page = 1;
        if (req.query && req.query.page) {
          page = req.query.page;
        }
        let page_size = 25;
        if (req.query && req.query.page_size) {
          page_size = parseInt(req.query.page_size);
        }
        let isUpcomming = false;
        if (data.isUpcomming) {
          isUpcomming = data.isUpcomming;
        }

        let endPoint = new Date();
        let where = {
          payment_status: { [Op.in]: [1, 'paid'] },
          provider_id: { [Op.in]: await getStaffIDList(req.user.id) },
          '$schedule.end$': { [Op.lte]: endPoint },
        };
        if (isUpcomming) {
          delete where['$schedule.end$'];
          where['$schedule.start$'] = { [Op.gte]: endPoint };
          where['payment_status'] = 1;
        }

        if (data.isOngoing) {
          var now = new Date();
          where['$schedule.start$'] = { [Op.lte]: now };
          where['$schedule.end$'] = { [Op.gte]: now };
          where['payment_status'] = { [Op.ne]: req.user.id };
        }
        let search = (data.search || '').replace(/\s+/, '').trim();
        if (!!!data.isOngoing && !!!data.isUpcomming) {
          if (!!data.startDate) {
            where['$schedule.start$'] = { [Op.gte]: new Date(data.startDate) };
          }
          if (!!data.endDate) {
            where['$schedule.end$'] = { [Op.lte]: new Date(data.endDate) };
          }
        }

        if (!!data.staffId) {
          where.provider_id = data.staffId;
        }

        where = {
          ...where,
          [Op.or]: [
            Sequelize.where(Sequelize.fn("concat",
              Sequelize.col("providerInfo.first_name"),
              Sequelize.col("providerInfo.middle_name"),
              Sequelize.col("providerInfo.last_name")
            ), {
              [Op.like]: `%${search}%`
            }),
            Sequelize.where(Sequelize.fn("concat",
              Sequelize.col("patientInfo.first_name"),
              Sequelize.col("patientInfo.middle_name"),
              Sequelize.col("patientInfo.last_name")
            ), {
              [Op.like]: `%${search}%`
            })]
        };


        let clinicPatient = false;
        let doctyPatient = false;
        if (!!req.body.patient_type && req.body.patient_type == 'myPatient') {
          clinicPatient = true;
        }
        if (!!req.body.patient_type && req.body.patient_type == 'doctyPatient') {
          // doctyPatient = true;
          where['$patientInfo.customeredTo.id$'] = null;
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
            {
              model: db.userFamilyView.scope(),
              foreignKey: 'patient_id',
              as: 'patientInfo',
              required: clinicPatient,
              attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture', 'parent', 'isd_code'],
              include: [{
                model: db.customer.scope(''),
                attributes: ['user_id'],
                as: 'customeredTo',
                required: clinicPatient,
                where: {
                  user_id: req.user.id
                }
              }]
            },
          ],
          order: [['createdAt', 'desc']],
          limit: getLimitOffset(page, page_size)
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

  getSupportedScheduleOfStaff: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let page = 1;
        if (req.query && req.query.page) {
          page = req.query.page;
        }
        let page_size = 25;
        if (req.query && req.query.page_size) {
          page_size = parseInt(req.query.page_size);
        }

        let endPoint = new Date();
        let where = {
          // patient_id: { [Op.in]: await getCusmoerIDList(req.user.id) },
          '$schedule.end$': { [Op.gte]: endPoint }
        };
        let search = (req.body.search || '').replace(/\s+/, '').trim();

        where = {
          ...where,
          [Op.or]: [
            Sequelize.where(Sequelize.fn("concat",
              Sequelize.fn("COALESCE", Sequelize.col("providerInfo.first_name"), ''),
              Sequelize.fn("COALESCE", Sequelize.col("providerInfo.middle_name"), ''),
              Sequelize.fn("COALESCE", Sequelize.col("providerInfo.last_name"), '')
            ), {
              [Op.like]: `%${search}%`
            }),
            Sequelize.where(Sequelize.fn("concat",
              Sequelize.fn("COALESCE", Sequelize.col("patientInfo.first_name"), ''),
              Sequelize.fn("COALESCE", Sequelize.col("patientInfo.middle_name"), ''),
              Sequelize.fn("COALESCE", Sequelize.col("patientInfo.last_name"), '')
            ), {
              [Op.like]: `%${search}%`
            })]
        };

        let clinicPatient = false;
        let doctyPatient = false;
        if (!!req.body.patient_type && req.body.patient_type == 'myPatient') {
          clinicPatient = true;
        }
        if (!!req.body.patient_type && req.body.patient_type == 'doctyPatient') {
          // doctyPatient = true;
          where['$patientInfo.customeredTo.id$'] = null;
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
            {
              model: db.userFamilyView.scope(),
              foreignKey: 'patient_id',
              as: 'patientInfo',
              required: clinicPatient,
              attributes: ['fullName', 'first_name', 'middle_name', 'last_name', 'id', 'email', 'phone_number', 'picture'],
              include: [{
                model: db.customer.scope(''),
                attributes: ['user_id'],
                as: 'customeredTo',
                required: clinicPatient,
                where: {
                  user_id: req.user.id
                }
              }]
            },
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
          limit: getLimitOffset(page, page_size)
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

  patientScheduledOfStaff: async (req, res, next) => {
    if (req.user && req.user.id) {
      try {
        let search = "";
        let page = 1;
        let orderKey = "id";
        let order = 'desc';
        let pageSize = 25;

        let bookingWhere = {
          provider_id: { [Op.in]: await getStaffIDList(req.user.id) },
        };
        if (req.body) {
          let data = req.body;
          search = data.search || "";
          orderKey = data.orderKey || "id";
          order = data.order || "desc";
          page = data.page || 1;
          pageSize = data.pageSize || 25;
        }
        let advisorOf = await db.health_advisor.findAll({ where: { clinic_id: req.user.id } });

        let where = {
        };
        if (!!advisorOf && advisorOf.length) {
          let ids = advisorOf.map(e => e.patient_id);
          where = {
            id: { [Op.notIn]: ids }
          };
        }
        if (search.length > 0) {
          where = {
            ...where,
            [Op.or]: [
              { 'first_name': { [Op.like]: `%${search}%` } },
              { 'last_name': { [Op.like]: `%${search}%` } },
              { 'middle_name': { [Op.like]: `%${search}%` } },
              { 'email': { [Op.like]: `%${search}%` } },
              { 'phone_number': { [Op.like]: `%${search}%` } },
            ]
          };
        }
        let associate = await db.associate.findAll({ where: { user_id: req.user.id } });
        let assocId = associate.map(res => res.associate);
        let includes = [
          {
            model: db.symptom_analysis,
            as: 'symptom_analysis',
            include: ['userInfo', 'changed_admin', 'changed_user'],
            separate: true,
            limit: 1,
            order: [['id', 'DESC']]
          },
          {
            model: db.health_advisor,
            as: 'advisors',
            attributes: ['patient_id', 'clinic_id'],
            required: false,
            where: { clinic_id: req.user.id, approved: 1 }
          },
          {
            model: db.booking,
            as: 'patient_bookings',
            attributes: [],
            where: {
              provider_id: { [Op.in]: assocId },
            },
            required: true
          },
          'user_medical',
          'medical_conditions',
          {
            model: db.activity_log,
            as: 'activity_log',
            limit: 1,
            order: [['createdAt', 'DESC']],
            required: false,
            attributes: ['createdAt', 'data'],
            where: {
              type: { [Op.like]: 'Login' }
            }
          }
        ];

        db.user.scope('publicInfo', 'contactInfo').findAndCountAll({
          order: [[orderKey, order]],
          limit: getLimitOffset(page, pageSize),
          include: includes,
          where: {
            //  id: { [Op.in]: patientIds },
            ...where
          }
        })
          .then(async (resp) => {
            let rpes = JSON.parse(JSON.stringify(resp.rows));
            let uids = rpes.map(e => e.id);
            if (uids.length && assocId.length) {
              let OneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
              let sk = `SELECT patient_id, COUNT(id) counts FROM bookings 
                      WHERE patient_id IN ( ${uids.join(',')})
                      AND createdAt > DATE('${OneYearAgo.toISOString()}')
                      AND provider_id in (${assocId.join(',')})
                      GROUP BY patient_id`;
              let d = await db.sequelize.query(sk);
              let dd = d[0];
              let obj = {};
              dd.forEach(element => {
                obj[element.patient_id] = element.counts;
              });
              // console.log(d[obj]);
              rpes.forEach(r => {
                r.bookings_in_year = obj[r.id];
              });
            }
            response(res, { count: resp.count, rows: rpes });
          }
          )
          .catch(err => {
            console.log(err);
            res.status(400).send({
              status: false,
              errors: err,
              error: `${err}`
            });
          });

      } catch (err) {
        console.log(err);
        res.status(400).send({
          status: false,
          errors: err,
          error: `${err}`
        });
      }
    } else {
      res.sendStatus(406).send(req);
    }
  },

  getUpcommingBookingsOfDoctor: (req, res, next) => {
    if (req.user && req.user.id) {
      console.log(req.body.user_id);
      var date = new Date();
      if (req.body.date) date = req.body.date;
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
            where: { end: { [Op.gte]: date }, }
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
  getPendingBookingsOfDoctor: async (req, res, next) => {
    if (req.user && req.user.id) {
      var user_id = req.body.user_id;
      let cond = {
        where: {
          status: { [Op.in]: [0, 7] }, // 'waiting', 'rescheduling'
          provider_id: user_id,
          // payment_status: 1
          [Op.or]: [
            { payment_status: 1 },
            {
              payment_status: 0,
              '$booking_update_request.status$': 5 // new_booking_by_support
            }
          ]
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
            ],
            required: false
          },]
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

  // patient 's schedule of providerInfo clinic staff
  getUpcommingBookingsOfPatient: (req, res, next) => {
    if (req.user && req.user.id) {
      var clinic_id = req.user.id;
      var user_id = req.body.user_id;
      var where = {
        status: { [Op.in]: [0, 5, 7] },
        '$providerInfo.associatedTo.user_id$': clinic_id,
        [Op.or]: [
          { patient_id: user_id, },
          { booked_by: user_id, }
        ]
      };

      db.booking.findAll({
        where: where,
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
      var clinic_id = req.user.id;
      var user_id = req.body.user_id;
      var where = {
        status: { [Op.in]: [0, 7] },
        payment_status: 1,
        '$providerInfo.associatedTo.user_id$': clinic_id,
        [Op.or]: [
          { patient_id: user_id, },
          { booked_by: user_id, }
        ]
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
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name'],
            include: [{
              model: db.associate.scope('withoutUser'),
              as: 'associatedTo',
              attributes: ['user_id', 'associate'],
            }],
          },
          'bookedByUser',
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
      var clinic_id = req.user.id;
      var user_id = req.body.user_id;
      let page = 1;
      if (req.query && req.query.page) {
        page = req.query.page;
      }

      let endPoint = new Date();
      let where = {
        '$providerInfo.associatedTo.user_id$': clinic_id,
        [Op.or]: [
          { status: { [Op.in]: [2, 3, 8] } },
          { '$schedule.end$': { [Op.lte]: endPoint } }
        ],
        [Op.or]: [
          { patient_id: user_id, },
          { booked_by: user_id, }
        ]
      };
      if (req.query && req.query.to) {
        let e = new Date(req.query.to).getTime();
        e = e + (24 * 60 * 60 * 1000);
        endPoint = new Date(e);
        where = {
          patient_id: user_id,
          '$providerInfo.associatedTo.user_id$': clinic_id,
          '$schedule.end$': { [Op.lte]: endPoint }
        };
      }

      if (req.query && req.query.from) {
        let from = new Date(req.query.from);
        where = {
          patient_id: user_id,
          '$providerInfo.associatedTo.user_id$': clinic_id,
          '$schedule.end$':
          {
            [Op.and]: [{ [Op.lte]: endPoint }, { [Op.gte]: from }]
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
            include: [{
              model: db.associate.scope('withoutUser'),
              as: 'associatedTo',
              attributes: ['user_id', 'associate'],
            }],
          },
          'bookedByUser'],
        order: [['createdAt', 'desc']],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },

  // Clinic -> suggest change time slot, provider
  transferScheduleRequest: async (req, res, next) => {
    try {
      if (req.user && req.user.id) {
        let data = req.body;
        console.log(data);
        try {

          var booking_update_request = {
            booking_id: data.id,
            reason: data.reason,
            old_provider_id: data.provider_id,
            new_provider_id: data.new_provider_id, //transferring to new doctor
            status: 'accepted',
            by_user: req.user.id
          };

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


            otpTrigger('Consultation_Schedule_Transfer_Patient',
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
          };

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
              time = scheduleTimeFormat(schedule);
              await db.schedule.update({ calendarId: 4, isReadOnly: false, title: 'Available at Docty.ai' }, { where: { id: schedule.id } });
            }

            crmTrigger('Consultation_Request_Reject_By_Clinic_Provider', {
              email: provider.email,
              subject: 'Docty Health Care: Consultation Request Reject By Clinic',
              your_name: provider.fullName,
              patient_name: patient.fullName,
              type: councelling_type(book.councelling_type),
              time: time,
              link: councelling_link(book),
              reason: data.description,
              support_name: req.user.fullName
            }, provider.lang || req.lang);
            crmTrigger('Consultation_Request_Reject_By_Clinic_Patient',
              {
                email: patient.email,
                subject: 'Docty Health Care: Consultation Request Reject By Clinic',
                your_name: patient.fullName,
                provider_name: provider.fullName,
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
                  patient_name: patient.fullName,
                  provider_name: provider.fullName,
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
          });
        });
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
  async getPrice(book) {
    let user_id = book.provider_id;
    if (typeof book.extras == 'string') book.extras = JSON.parse(book.extras);
    let assoc = await db.associate.findOne({ where: { associate: user_id } });
    let patient_user_insurance = null;
    if (assoc) {
      let doctor = await db.user.findByPk(user_id, { attributes: ['id', 'expertise_level'] });
      if (!!book.extras && !!book.extras.insurance_provider_id) {
        let wh = {
          user_id: book.patient_id,
          company: book.extras.insurance_provider_id,
          [Op.or]: [
            { end_date: null },
            { end_date: { [Op.gte]: new Date() } },
          ],
          [Op.or]: [
            { member_id: (book.family_member_id || 0) },
            { '$members.member_id$': (book.family_member_id || 0) }
          ]
        }
        patient_user_insurance = await db.user_insurance.findAll({
          where: wh,
          include: ['members']
        }).then(r => r[0]).catch(e => null);
      }
      // let sql = '';
      let company = null;
      if (!!patient_user_insurance) {
        company = patient_user_insurance.company;
      }
      let queryResult = null;

      if (!!company && !!book.extras.insuranceServiceId) {
        queryResult = await db.company_service.findOne({
          where: {
            id: book.extras.insuranceServiceId,
            insurance_provider_id: company,
            user_id: assoc.user_id,
            expertise_level: doctor.expertise_level || 0,
          }
        })
      } else if (!!book.extras && !!book.extras.insuranceServiceId) {
        queryResult = await db.company_service.findOne({
          where: {
            id: book.extras.insuranceServiceId,
            // insurance_provider_id: company,
            user_id: assoc.user_id,
            expertise_level: doctor.expertise_level || 0,
          }
        })

      } else {
        if (book.speciality_id) {
          queryResult = await db.company_service.findOne({
            where: {
              '$user_speciality.speciality_id$': book.speciality_id,
              user_id: assoc.user_id,
              expertise_level: doctor.expertise_level || 0,
            },
            include: ['user_speciality']
          })
        }
      }

      if (!!queryResult && !!queryResult.total) {
        return {
          amount: queryResult.total || 0,
          total: queryResult.total || 0,
          copay: queryResult.copay || 0,
          insured_cover: queryResult.insured_cover || 0,
          provider: (patient_user_insurance &&
            patient_user_insurance.insurance_provider &&
            patient_user_insurance.insurance_provider.name ? patient_user_insurance.insurance_provider.name : '')
        };
      }
    }

    let user_service = await db.user_service.findOne({
      where: {
        user_id: user_id,
        speciality_id: book.speciality_id
      }
    });
    let ob = { amount: 0 };
    if (!!user_service) {
      ob = {
        amount: user_service.price || 0,
        total: user_service.price || 0,
        copay: user_service.price || 0,
        insured_cover: 0,
        provider: null
      };
    }
    return ob;

  },
  billingDetails: async (req, res, next) => {
    if (req.user && req.user.id) {
      const from = !!req.body.from ? req.body.from : 0;
      db.booking.findOne({
        where: {
          id: req.body.id,
          // [Op.or]: [
          //   { patient_id: req.user.id },
          //   { booked_by: req.user.id },
          // ]
        },
        attributes: ['id', 'amount', 'councelling_type', 'patient_id', 'reference_id', 'provider_id', 'speciality_id', 'extras'],
        include: ['booking_support', 'providerInfo', 'patientInfo']
      }).then(async resp => {

        let obj = {
          amount: res.amount,
        };
        if (!!!obj.amount) {
          obj = await module.exports.getPrice(resp);
          if (from == 5) {
            obj.amount = resp.amount;
          }
          await resp.update(obj);
        }
        let respons = JSON.parse(JSON.stringify(resp));
        respons = Object.assign(respons, obj);
        return response(res, respons);
      }).catch(err => {
        return errorResponse(res, err);
      });
    } else {
      res.sendStatus(403);
    }
  },
};
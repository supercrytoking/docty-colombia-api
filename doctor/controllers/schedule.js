const Sequelize = require('sequelize');
const config = require('../../config/config.json');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');
const formUrl = config.jotform.formUrl;

module.exports = {
  getSchedule: async (req, res, next) => {
    res.send({
      status: true, message: 'dev pending'
    });
  },
  getMyTodaysSlot: async (req, res, next) => {
    if (req.user && req.user.id) {
      let id = req.user.id;
      var end = new Date();
      var start = new Date();
      start.setHours(0);
      start.setMinutes(0);
      start.setSeconds(0);
      end.setDate(end.getDate() + 1);

      if (req.query && req.query.start) start = new Date(req.query.start);
      if (req.query && req.query.end) end = new Date(req.query.end);

      db.schedule.findAll({
        where: {
          user_id: id,
          calendarId: { [Op.in]: [4] },
          start: { [Op.gte]: start },
          end: { [Op.lte]: end },
          state: { [Op.ne]: 'Busy' },
        }
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    } else {
      res.sendStatus(403);
    }
  },
  getMyPendingSupportRequest: async (req, res, next) => {
    if (req.user && req.user.id) {
      let cond = {
        where: {
          // status: { [Op.in]: [0, 7] },
          payment_status: 1
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
            model: db.booking_support,
            as: 'booking_support',
            where: {
              provider_id: req.user.id,
              status: { [Op.in]: [0] }, //waiting
            },
          },
          'patientInfo', 'bookedByUser',
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
  getMyPendingRequest: async (req, res, next) => {
    if (req.user && req.user.id) {
      let cond = {
        where: {
          status: { [Op.in]: [0, 7] },
          provider_id: req.user.id,
          payment_status: 1
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
          'booking_support',
          'patientInfo', 'bookedByUser',
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
  getUpcommingBookings: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.booking.findAll({
        where: {
          // provider_id: req.user.id,
          // [Op.or]: [
          //   { provider_id: req.user.id, },
          //   { '$booking_support.provider_id$': req.user.id, },
          // ],
          // [Op.or]: [
          //   { status: { [Op.in]: [5, 1] } },
          //   { '$booking_support.status$': { [Op.in]: [5, 1] } }
          // provider_id: req.user.id,
          [Op.and]: [
            {
              [Op.or]: [
                { provider_id: req.user.id, },
                { '$booking_support.provider_id$': req.user.id, },
              ]
            },
            {
              [Op.or]: [
                { status: { [Op.in]: [5, 1] } },
                { '$booking_support.status$': { [Op.in]: [5, 1] } }
              ]
            }
          ]
        },
        include: [
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: { end: { [Op.gte]: (new Date()) }, }
          },
          {
            model: db.booking_support,
            as: 'booking_support',
            // where: {
            //   // provider_id: req.user.id,
            //   // status: { [Op.in]: [5, 1] }, //accept, //running
            // },
            required: false
          },
          'providerInfo',
          'bookedByUser',
          'patientInfo'
        ]
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        console.log(err);
        return errorResponse(res, err);
      });
    }
  },
  getPastBookings: async (req, res, next) => {
    if (req.user && req.user.id) {
      let page = 1;
      if (req.query && req.query.page) {
        page = req.query.page;
      }

      let endPoint = new Date();
      let where = {
        provider_id: req.user.id,
        payment_status: 1,
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
          provider_id: req.user.id,
          payment_status: 1,
          '$schedule.end$': { [Op.lte]: endPoint }
        };
      }

      if (req.query && req.query.from) {
        let from = new Date(req.query.from);
        where = {
          provider_id: req.user.id,
          payment_status: 1,
          [Op.and]: [
            { '$schedule.end$': { [Op.lte]: endPoint } },
            { '$schedule.end$': { [Op.gte]: from } }
          ]
        };
      }

      db.booking.findAndCountAll({
        where: where,
        include: ['schedule', 'patientInfo', 'bookedByUser', 'booking_update_request', 'booking_support'],
        order: [['createdAt', 'desc']],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },
  consultationForm: async (req, res, next) => {
    let sql = `
    SELECT cj.form_id,a.associate,a.user_id,CONCAT('${formUrl}',cj.form_id) form 
    FROM associates a, clinic_jotforms cj 
    WHERE a.user_id = cj.clinic_id AND a.associate = ${req.user.id}    
    `;
    let respo = { jotform: `${formUrl}${config.jotform.formId}` };
    db.sequelize.query(sql).spread((resp, m) => {
      if (!!resp && !!resp.length && !!resp[0].form) {
        respo = { jotform: resp[0].form };
      }
      res.send(respo);
    }).catch(() => res.send(respo));
  }
};
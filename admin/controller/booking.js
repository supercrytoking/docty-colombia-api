const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");

const { response, errorResponse } = require('../../commons/response');
const { getLimitOffset } = require('../../commons/paginator');

module.exports = {
  getBookingDetails: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.booking.findOne({
        where: {
          id: req.params.id
        },
        include: [
          'providerInfo',
          'patientInfo',
          'analysis',
          'schedule',
          'booking_calls',
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
        ]
      }).then(async resp => {
        let data = JSON.parse(JSON.stringify(resp));
        let doc = await db.user_document.findOne({
          where: {
            user_id: data.patient_id,
            title: 'CONSULTATION_NOTE',
            remark: { [Op.like]: `%${data.reference_id}%` }
          }
        });
        if (!!doc && !!doc.document_path) {
          data.hippaForm = doc.document_path.trim();
        }
        return response(res, data);
      }).catch(err => {
        return errorResponse(res, err);
      });
    } else {
      res.sendStatus(403);
    }
  },
  deleteBooking: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.booking.destroy({ where: { id: req.body.id } }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    } else {
      res.sendStatus(403);
    }
  },

  getOngoingBookings: async (req, res, next) => {
    if (req.user && req.user.id) {
      let search = "";
      let page = 1;
      let orderKey = "createdAt";
      let order = 'desc';
      let pageSize = 25;
      // let where = {
      //   [Op.or]: [
      //     { status: 3 },
      //     { '$schedule.end$': { [Op.lte]: new Date() } }
      //   ]
      // }
      let where = {};

      if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
      }
      if (search.length > 0) {
        where = {
          ...where,
          [Op.or]: [
            { '$providerInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.email$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.phone_number$': { [Op.like]: `%${search}%` } },

            { '$patientInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.email$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.phone_number$': { [Op.like]: `%${search}%` } },
          ]
        };
      }
      var now = new Date();
      db.booking.findAndCountAll({
        where: where,
        include: [{
          model: db.schedule,
          as: 'schedule',
          attributes: ['start', 'end', 'id'],
          where: { start: { [Op.lte]: now }, end: { [Op.gte]: now } }
        },
        {
          model: db.user,
          as: 'providerInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
          required: true
        },
        {
          model: db.userFamilyView,
          as: 'patientInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
          required: true
        }
        ],
        order: [[orderKey, order]],
        limit: getLimitOffset(page, pageSize)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        console.log(`${err}`);
        return errorResponse(res, err);
      });
    }
  },

  getPendingPrescriptions: async (req, res, next) => {
    if (req.user && req.user.id) {
      let search = "";
      let page = 1;
      let orderKey = "createdAt";
      let order = 'desc';
      let pageSize = 25;
      // let where = {
      //   [Op.or]: [
      //     { status: 3 },
      //     { '$schedule.end$': { [Op.lte]: new Date() } }
      //   ]
      // }
      let where = {
        status: 3,
      };//complete

      if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
      }
      if (search.length > 0) {
        where = {
          ...where,
          [Op.or]: [
            { '$providerInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.email$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.phone_number$': { [Op.like]: `%${search}%` } },

            { '$patientInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.email$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.phone_number$': { [Op.like]: `%${search}%` } },
          ],
          '$prescription.id$': { [Op.eq]: null }
        };
      }
      var now = new Date();
      db.booking.findAndCountAll({
        where: where,
        include: [{
          model: db.schedule,
          as: 'schedule',
          attributes: ['start', 'end', 'id'],

        },
        {
          model: db.user,
          as: 'providerInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
          required: true
        },
        {
          model: db.userFamilyView,
          as: 'patientInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
          required: true
        },
        {
          model: db.prescription,
          as: 'prescription',
          attributes: ['id', 'reference_id',],
          required: false
        },
        ],
        order: [[orderKey, order]],
        limit: getLimitOffset(page, pageSize)
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
      let search = "";
      let page = 1;
      let orderKey = "createdAt";
      let order = 'desc';
      let pageSize = 25;
      let where = {
        [Op.or]: [
          { status: { [Op.in]: [2, 3, 8] } },
          { '$schedule.end$': { [Op.lte]: new Date } }
        ]
      };

      if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "desc";
        page = data.page || 1;
        pageSize = data.pageSize || 25;
      }
      let orderArray = [orderKey, order];
      if (orderKey === "start") {
        orderArray = ['schedule', orderKey, order];
      }
      if (search.length > 0) {
        where = {
          ...where,
          [Op.or]: [
            { '$providerInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.email$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.phone_number$': { [Op.like]: `%${search}%` } },

            { '$patientInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.email$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.phone_number$': { [Op.like]: `%${search}%` } },
          ]
        };
      }

      db.booking.findAndCountAll({
        where: where,
        include: [{
          model: db.schedule,
          as: 'schedule',
          attributes: ['start', 'end', 'id'],
          // where: { end: { [Op.lte]: (new Date()) } }
        },
        {
          model: db.user,
          as: 'providerInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
          required: true
        },
        {
          model: db.userFamilyView,
          as: 'patientInfo',
          attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
          required: true
        }],
        order: [orderArray],
        limit: getLimitOffset(page, pageSize)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        console.log(err);
        return errorResponse(res, err);
      });
    }
  },
  getUpcommingBookings: async (req, res, next) => {
    if (req.user && req.user.id) {
      let search = "";
      let page = 1;
      let orderKey = "createdAt";
      let order = 'desc';
      let where = {
        status: { [Op.in]: [0, 5, 7] },
        payment_status: 1
      };



      if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "asc";
        page = data.page || 1;
      }
      if (search.length > 0) {
        where = {
          ...where,
          [Op.or]: [
            { '$providerInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.email$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.phone_number$': { [Op.like]: `%${search}%` } },

            { '$patientInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.email$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.phone_number$': { [Op.like]: `%${search}%` } },
          ]
        };
      }

      let orderArray = [orderKey, order];
      if (orderKey === "start") {
        orderArray = ['schedule', orderKey, order];
      }

      db.booking.findAndCountAll({
        where: where,
        include: [
          {
            model: db.user,
            as: 'providerInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
            required: true
          },
          {
            model: db.userFamilyView,
            as: 'patientInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
            required: true
          },
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: { end: { [Op.gte]: (new Date()) }, }
          },],
        order: [orderArray],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },
  getScheduledBookings: async (req, res, next) => {
    if (req.user && req.user.id) {
      let search = "";
      let page = 1;
      let orderKey = "createdAt";
      let order = 'desc';
      let where = {
        status: { [Op.in]: [0, 5, 7] },
        // payment_status: 1
      };

      if (req.body) {
        let data = req.body;
        search = data.search || "";
        orderKey = data.orderKey || "createdAt";
        order = data.order || "asc";
        page = data.page || 1;
      }
      let orderArray = [orderKey, order];
      if (orderKey === "start") {
        orderArray = ['schedule', orderKey, order];
      }

      if (search.length > 0) {
        where = {
          ...where,
          [Op.or]: [
            { '$providerInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.email$': { [Op.like]: `%${search}%` } },
            { '$providerInfo.phone_number$': { [Op.like]: `%${search}%` } },

            { '$patientInfo.first_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.last_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.middle_name$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.email$': { [Op.like]: `%${search}%` } },
            { '$patientInfo.phone_number$': { [Op.like]: `%${search}%` } },
          ]
        };
      }

      db.booking.findAndCountAll({
        where: where,
        include: [
          {
            model: db.user,
            as: 'providerInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
            required: true
          },
          {
            model: db.userFamilyView,
            as: 'patientInfo',
            attributes: ['id', 'fullName', 'picture', 'first_name', 'last_name', 'middle_name', 'email', 'phone_number'],
            required: true
          },
          {
            model: db.schedule,
            as: 'schedule',
            attributes: ['start', 'end', 'id'],
            where: { end: { [Op.gte]: (new Date()) }, }
          },
          {
            model: db.booking_update_request,
            as: 'booking_update_request',
            include: ['admin'],
            where: {
              status: 5//'new_booking_by_support'
            },
            required: true
          }
        ],
        order: [orderArray],
        limit: getLimitOffset(page)
      }).then(resp => {
        return response(res, resp);
      }).catch(err => {
        return errorResponse(res, err);
      });
    }
  },
  refundBooking: async (req, res, next) => {
    let data = req.body || {};
    db.refund.findOrCreate({ where: { booking_id: data.booking_id } }).then(async (r) => {
      await r[0].update(data);
      await db.invoice.update({ status: 'Refund' }, { where: { booking_id: data.booking_id } });
      await db.booking.update({ status: 'refund' }, { where: { id: data.booking_id } });
      return r[0]
    }).then(r => res.send({ status: true }))
      .catch(e => res.status(400).send({ status: false, error: `${e}` }))
  }
};
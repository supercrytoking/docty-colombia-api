const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

module.exports = {
  getBookingDetails: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.booking.findOne({
        where: {
          id: req.params.id,
          [Op.or]: [
            { provider_id: req.user.id, },
            { '$booking_support.provider_id$': req.user.id, },
          ],
        },
        include: [
          'patientInfo',
          'bookedByUser',
          'analysis',
          'schedule',
          'booking_calls',
          'booking_support'
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
        return errorResponse(res, err)
      })
    } else {
      res.sendStatus(403);
    }
  },
  setBookingRunning: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.booking.update(
        { status: 'running' },
        {
          where: {
            status: { [Op.in]: [5, 10] }, provider_id: req.user.id, id: req.body.id
          }
        }).then(resp => response(res, resp)).catch(err => errorResponse(res, err))
    } else {
      res.sendStatus(406);
    }
  }
}